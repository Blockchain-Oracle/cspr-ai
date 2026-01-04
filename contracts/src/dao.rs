//! CSPR.AI Governance DAO
//!
//! A decentralized autonomous organization for governance.
//! Token holders can create proposals and vote on them.

use alloc::string::String;
use odra::prelude::*;
use odra::casper_types::U256;
use odra_modules::cep18_token::Cep18;
use odra_modules::access::Ownable;

/// Proposal action types
#[odra::odra_type]
pub enum ProposalAction {
    /// Mint new governance tokens
    MintTokens { recipient: Address, amount: U256 },
    /// Transfer from treasury
    TreasuryTransfer { recipient: Address, amount: U256 },
    /// Update voting period
    UpdateVotingPeriod { new_period: u64 },
    /// Generic action with custom data
    Custom { description: String },
}

/// Proposal status
/// Note: odra_type already derives PartialEq, Eq, Clone, Debug
#[odra::odra_type]
pub enum ProposalStatus {
    Active,
    Passed,
    Failed,
    Executed,
    Cancelled,
}

/// A governance proposal
#[odra::odra_type]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub description: String,
    pub action: ProposalAction,
    pub yes_votes: U256,
    pub no_votes: U256,
    pub start_time: u64,
    pub end_time: u64,
    pub status: ProposalStatus,
}

/// A vote cast by a user
#[odra::odra_type]
pub struct Vote {
    pub voter: Address,
    pub proposal_id: u64,
    pub support: bool,
    pub amount: U256,
}

/// Events
#[odra::event]
pub struct ProposalCreated {
    pub proposal_id: u64,
    pub proposer: Address,
    pub description: String,
}

#[odra::event]
pub struct VoteCast {
    pub proposal_id: u64,
    pub voter: Address,
    pub support: bool,
    pub votes: U256,
}

#[odra::event]
pub struct ProposalExecuted {
    pub proposal_id: u64,
}

/// DAO Errors
#[odra::odra_error]
pub enum DAOError {
    /// Proposal not found
    ProposalNotFound = 1,
    /// Voting has not started
    VotingNotStarted = 2,
    /// Voting has ended
    VotingEnded = 3,
    /// Voting still active
    VotingStillActive = 4,
    /// Not enough tokens to propose
    InsufficientTokensToPropose = 5,
    /// Already voted on this proposal
    AlreadyVoted = 6,
    /// Proposal already executed
    AlreadyExecuted = 7,
    /// Proposal did not pass
    ProposalNotPassed = 8,
    /// No voting power
    NoVotingPower = 9,
}

/// CSPR.AI Governance DAO
#[odra::module(events = [ProposalCreated, VoteCast, ProposalExecuted])]
pub struct GovernanceDAO {
    /// Governance token
    token: SubModule<Cep18>,
    /// Ownership
    owner: SubModule<Ownable>,

    /// Proposals storage
    proposals: Mapping<u64, Proposal>,
    /// Proposal count
    proposal_count: Var<u64>,

    /// Votes: (proposal_id, voter) -> Vote
    votes: Mapping<(u64, Address), Vote>,
    /// Locked tokens per proposal: (proposal_id, voter) -> amount
    locked_tokens: Mapping<(u64, Address), U256>,

    /// Configuration
    voting_period: Var<u64>,          // Duration in milliseconds
    proposal_threshold: Var<U256>,    // Minimum tokens to propose
    quorum: Var<U256>,                // Minimum votes for validity
}

#[odra::module]
impl GovernanceDAO {
    /// Initialize the DAO
    pub fn init(
        &mut self,
        token_name: String,
        token_symbol: String,
        initial_supply: U256,
        voting_period_ms: u64,
        proposal_threshold: U256,
        quorum: U256,
    ) {
        // Initialize governance token (Odra 2.5.0: no security restrictions)
        // raw_mint() is available without access checks for governance minting
        self.token.init(
            token_symbol,
            token_name,
            18,             // decimals
            initial_supply,
        );

        // Initialize ownership (Odra 2.5.0: requires caller address)
        let caller = self.env().caller();
        self.owner.init(caller);

        // Set configuration
        self.voting_period.set(voting_period_ms);
        self.proposal_threshold.set(proposal_threshold);
        self.quorum.set(quorum);
        self.proposal_count.set(0);
    }

    // ============ Proposal Functions ============

    /// Create a new proposal
    pub fn create_proposal(&mut self, description: String, action: ProposalAction) -> u64 {
        let caller = self.env().caller();
        let balance = self.token.balance_of(&caller);

        // Check proposal threshold
        if balance < self.proposal_threshold.get_or_default() {
            self.env().revert(DAOError::InsufficientTokensToPropose);
        }

        let proposal_id = self.proposal_count.get_or_default() + 1;
        let current_time = self.env().get_block_time();
        let end_time = current_time + self.voting_period.get_or_default();

        let proposal = Proposal {
            id: proposal_id,
            proposer: caller,
            description: description.clone(),
            action,
            yes_votes: U256::zero(),
            no_votes: U256::zero(),
            start_time: current_time,
            end_time,
            status: ProposalStatus::Active,
        };

        self.proposals.set(&proposal_id, proposal);
        self.proposal_count.set(proposal_id);

        self.env().emit_event(ProposalCreated {
            proposal_id,
            proposer: caller,
            description,
        });

        proposal_id
    }

    /// Vote on a proposal
    /// Note: Uses snapshot-based voting - voting power is your token balance at vote time
    /// Tokens are tracked but not actually transferred (no lock needed)
    pub fn vote(&mut self, proposal_id: u64, support: bool, amount: U256) {
        let caller = self.env().caller();
        let current_time = self.env().get_block_time();

        // Get proposal
        let mut proposal = self
            .proposals
            .get(&proposal_id)
            .unwrap_or_else(|| self.env().revert(DAOError::ProposalNotFound));

        // Check voting is active
        if current_time < proposal.start_time {
            self.env().revert(DAOError::VotingNotStarted);
        }
        if current_time > proposal.end_time {
            self.env().revert(DAOError::VotingEnded);
        }

        // Check not already voted
        if self.votes.get(&(proposal_id, caller)).is_some() {
            self.env().revert(DAOError::AlreadyVoted);
        }

        // Check voting power (snapshot-based: use current balance)
        let balance = self.token.balance_of(&caller);
        if balance < amount || amount == U256::zero() {
            self.env().revert(DAOError::NoVotingPower);
        }

        // Track vote weight (no actual token transfer needed for snapshot voting)
        self.locked_tokens.set(&(proposal_id, caller), amount);

        // Record vote
        if support {
            proposal.yes_votes += amount;
        } else {
            proposal.no_votes += amount;
        }
        self.proposals.set(&proposal_id, proposal);

        let vote = Vote {
            voter: caller,
            proposal_id,
            support,
            amount,
        };
        self.votes.set(&(proposal_id, caller), vote);

        self.env().emit_event(VoteCast {
            proposal_id,
            voter: caller,
            support,
            votes: amount,
        });
    }

    /// Finalize a proposal after voting ends
    pub fn finalize(&mut self, proposal_id: u64) {
        let current_time = self.env().get_block_time();

        let mut proposal = self
            .proposals
            .get(&proposal_id)
            .unwrap_or_else(|| self.env().revert(DAOError::ProposalNotFound));

        // Check voting has ended
        if current_time <= proposal.end_time {
            self.env().revert(DAOError::VotingStillActive);
        }

        // Check not already finalized
        if proposal.status != ProposalStatus::Active {
            return;
        }

        let total_votes = proposal.yes_votes + proposal.no_votes;
        let quorum = self.quorum.get_or_default();

        // Determine outcome
        if total_votes >= quorum && proposal.yes_votes > proposal.no_votes {
            proposal.status = ProposalStatus::Passed;
        } else {
            proposal.status = ProposalStatus::Failed;
        }

        self.proposals.set(&proposal_id, proposal);
    }

    /// Execute a passed proposal
    pub fn execute(&mut self, proposal_id: u64) {
        // Ensure proposal is finalized first
        self.finalize(proposal_id);

        // Fetch proposal after finalization
        let mut proposal = self
            .proposals
            .get(&proposal_id)
            .unwrap_or_else(|| self.env().revert(DAOError::ProposalNotFound));

        // Check proposal passed
        if proposal.status != ProposalStatus::Passed {
            self.env().revert(DAOError::ProposalNotPassed);
        }

        // Execute action
        match &proposal.action {
            ProposalAction::MintTokens { recipient, amount } => {
                self.token.raw_mint(recipient, amount);
            }
            ProposalAction::UpdateVotingPeriod { new_period } => {
                self.voting_period.set(*new_period);
            }
            _ => {
                // Custom actions handled externally
            }
        }

        proposal.status = ProposalStatus::Executed;
        self.proposals.set(&proposal_id, proposal);

        self.env().emit_event(ProposalExecuted { proposal_id });
    }

    /// Get vote record for a proposal
    /// (No withdraw needed since tokens were never locked - snapshot-based voting)
    pub fn get_vote(&self, proposal_id: u64, voter: &Address) -> Option<Vote> {
        self.votes.get(&(proposal_id, *voter))
    }

    /// Get voting weight used for a proposal
    pub fn get_vote_weight(&self, proposal_id: u64, voter: &Address) -> U256 {
        self.locked_tokens
            .get(&(proposal_id, *voter))
            .unwrap_or(U256::zero())
    }

    // ============ View Functions ============

    /// Get a proposal
    pub fn get_proposal(&self, proposal_id: u64) -> Option<Proposal> {
        self.proposals.get(&proposal_id)
    }

    /// Get proposal count
    pub fn proposal_count(&self) -> u64 {
        self.proposal_count.get_or_default()
    }

    /// Get voting power for an account
    pub fn voting_power(&self, account: &Address) -> U256 {
        self.token.balance_of(account)
    }

    /// Get configuration
    pub fn config(&self) -> (u64, U256, U256) {
        (
            self.voting_period.get_or_default(),
            self.proposal_threshold.get_or_default(),
            self.quorum.get_or_default(),
        )
    }

    // ============ Token Functions (delegated) ============

    pub fn token_name(&self) -> String {
        self.token.name()
    }

    pub fn token_symbol(&self) -> String {
        self.token.symbol()
    }

    pub fn token_total_supply(&self) -> U256 {
        self.token.total_supply()
    }

    pub fn token_balance_of(&self, account: &Address) -> U256 {
        self.token.balance_of(account)
    }

    pub fn token_transfer(&mut self, to: &Address, amount: &U256) {
        self.token.transfer(to, amount);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::string::ToString;
    use odra::host::Deployer;

    fn setup() -> GovernanceDAOHostRef {
        let env = odra_test::env();
        let args = GovernanceDAOInitArgs {
            token_name: "CSPR.AI Governance".to_string(),
            token_symbol: "CSPRGOV".to_string(),
            initial_supply: U256::from(1_000_000u64),
            voting_period_ms: 10 * 60 * 1000, // 10 minutes
            proposal_threshold: U256::from(100u64),
            quorum: U256::from(1000u64),
        };
        GovernanceDAO::deploy(&env, args)
    }

    #[test]
    fn test_create_proposal() {
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        assert_eq!(proposal_id, 1);
        assert_eq!(dao.proposal_count(), 1);

        let proposal = dao.get_proposal(1).unwrap();
        assert_eq!(proposal.description, "Test Proposal");
        assert_eq!(proposal.status, ProposalStatus::Active);
    }

    #[test]
    fn test_vote_on_proposal() {
        let env = odra_test::env();
        let mut dao = setup();

        // Create proposal
        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        // Vote with snapshot balance (no transfer needed)
        let vote_amount = U256::from(500u64);
        dao.vote(proposal_id, true, vote_amount);

        // Check vote was recorded
        let proposal = dao.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.yes_votes, vote_amount);
        assert_eq!(proposal.no_votes, U256::zero());

        // Check vote weight was tracked
        let caller = env.get_account(0);
        let vote_weight = dao.get_vote_weight(proposal_id, &caller);
        assert_eq!(vote_weight, vote_amount);
    }

    #[test]
    #[should_panic(expected = "AlreadyVoted")]
    fn test_cannot_double_vote() {
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        // First vote succeeds
        dao.vote(proposal_id, true, U256::from(100u64));

        // Second vote should panic
        dao.vote(proposal_id, false, U256::from(100u64));
    }

    #[test]
    #[should_panic(expected = "NoVotingPower")]
    fn test_vote_exceeds_balance() {
        let env = odra_test::env();
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        // Try to vote with more than balance (deployer has 1M tokens)
        let caller = env.get_account(0);
        let balance = dao.token_balance_of(&caller);
        dao.vote(proposal_id, true, balance + U256::from(1u64));
    }

    #[test]
    fn test_finalize_passed_proposal() {
        let env = odra_test::env();
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        // Vote yes with amount exceeding quorum (1000)
        dao.vote(proposal_id, true, U256::from(1500u64));

        // Advance time past voting period (10 minutes)
        env.advance_block_time(11 * 60 * 1000);

        // Finalize proposal
        dao.finalize(proposal_id);

        // Check status is Passed
        let proposal = dao.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, ProposalStatus::Passed);
    }

    #[test]
    fn test_finalize_failed_proposal_low_votes() {
        let env = odra_test::env();
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        // Vote no with more votes than yes, but both exceed quorum
        dao.vote(proposal_id, true, U256::from(800u64));

        // Switch to another account for second vote
        env.set_caller(env.get_account(1));

        // Transfer tokens to second account first
        env.set_caller(env.get_account(0));
        dao.token_transfer(&env.get_account(1), &U256::from(1000u64));

        env.set_caller(env.get_account(1));
        dao.vote(proposal_id, false, U256::from(900u64));

        // Advance time past voting period
        env.set_caller(env.get_account(0));
        env.advance_block_time(11 * 60 * 1000);

        // Finalize proposal
        dao.finalize(proposal_id);

        // Check status is Failed (no > yes but still)
        let proposal = dao.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, ProposalStatus::Failed);
    }

    #[test]
    fn test_finalize_failed_proposal_low_quorum() {
        let env = odra_test::env();
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        // Vote with amount below quorum (1000)
        dao.vote(proposal_id, true, U256::from(500u64));

        // Advance time past voting period
        env.advance_block_time(11 * 60 * 1000);

        // Finalize proposal
        dao.finalize(proposal_id);

        // Check status is Failed (didn't meet quorum)
        let proposal = dao.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, ProposalStatus::Failed);
    }

    #[test]
    fn test_execute_mint_proposal() {
        let env = odra_test::env();
        let mut dao = setup();

        let recipient = env.get_account(1);
        let mint_amount = U256::from(5000u64);

        let proposal_id = dao.create_proposal(
            "Mint new tokens".to_string(),
            ProposalAction::MintTokens {
                recipient,
                amount: mint_amount,
            },
        );

        // Vote yes with quorum
        dao.vote(proposal_id, true, U256::from(1500u64));

        // Advance time and execute
        env.advance_block_time(11 * 60 * 1000);
        dao.execute(proposal_id);

        // Check proposal status
        let proposal = dao.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, ProposalStatus::Executed);

        // Check tokens were minted
        let balance = dao.token_balance_of(&recipient);
        assert_eq!(balance, mint_amount);
    }

    #[test]
    fn test_execute_update_voting_period_proposal() {
        let env = odra_test::env();
        let mut dao = setup();

        let new_period = 20 * 60 * 1000; // 20 minutes

        let proposal_id = dao.create_proposal(
            "Update voting period".to_string(),
            ProposalAction::UpdateVotingPeriod {
                new_period,
            },
        );

        // Vote yes with quorum
        dao.vote(proposal_id, true, U256::from(1500u64));

        // Advance time and execute
        env.advance_block_time(11 * 60 * 1000);
        dao.execute(proposal_id);

        // Check proposal status
        let proposal = dao.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, ProposalStatus::Executed);

        // Check config was updated
        let (voting_period, _, _) = dao.config();
        assert_eq!(voting_period, new_period);
    }

    #[test]
    #[should_panic(expected = "ProposalNotPassed")]
    fn test_cannot_execute_failed_proposal() {
        let env = odra_test::env();
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        // Vote below quorum
        dao.vote(proposal_id, true, U256::from(500u64));

        // Advance time past voting period
        env.advance_block_time(11 * 60 * 1000);

        // Try to execute (should fail after finalization)
        dao.execute(proposal_id);
    }

    #[test]
    #[should_panic(expected = "InsufficientTokensToPropose")]
    fn test_cannot_propose_without_threshold() {
        let env = odra_test::env();
        let mut dao = setup();

        // Switch to account with no tokens
        env.set_caller(env.get_account(1));

        // Try to create proposal (should fail - needs 100 tokens)
        dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );
    }

    #[test]
    fn test_get_vote_record() {
        let env = odra_test::env();
        let mut dao = setup();

        let proposal_id = dao.create_proposal(
            "Test Proposal".to_string(),
            ProposalAction::Custom {
                description: "Do something".to_string(),
            },
        );

        let vote_amount = U256::from(500u64);
        dao.vote(proposal_id, true, vote_amount);

        // Check vote record
        let caller = env.get_account(0);
        let vote = dao.get_vote(proposal_id, &caller).unwrap();
        assert_eq!(vote.voter, caller);
        assert_eq!(vote.support, true);
        assert_eq!(vote.amount, vote_amount);
    }
}

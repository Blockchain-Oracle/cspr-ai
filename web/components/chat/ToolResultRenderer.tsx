'use client';

import * as React from 'react';
import { ToolResultCard } from './ToolResultCard';

// Blockchain Components
import { BalanceCard } from '@/components/blockchain/BalanceCard';
import { DeployStatusCard, type DeployStatusData, DeployHistoryList } from '@/components/blockchain/DeployStatusCard';
import { DaoProposalCard, type DaoProposalData, DaoProposalList } from '@/components/blockchain/DaoProposalCard';
import { DexPoolCard, type DexPoolData } from '@/components/blockchain/DexPoolCard';
import { StakingInfoCard, type Delegation } from '@/components/blockchain/StakingInfoCard';
import { TokenBalanceList, type TokenBalance } from '@/components/blockchain/TokenBalanceList';
import { UnsignedDeployCard, type UnsignedDeployData } from '@/components/blockchain/UnsignedDeployCard';
import { NFTGallery, type NFT } from '@/components/blockchain/NFTGallery';
import { NFTDetailCard, type NFTDetailData } from '@/components/blockchain/NFTDetailCard';
import { NFTActionHistory, type NFTActionHistoryData } from '@/components/blockchain/NFTActionHistory';
import { ValidatorList, type Validator } from '@/components/blockchain/ValidatorList';
import { ValidatorRewardHistory, type ValidatorRewardHistoryData } from '@/components/blockchain/ValidatorRewardHistory';
import { ValidatorBlockHistory, type ValidatorBlockHistoryData } from '@/components/blockchain/ValidatorBlockHistory';
import { AuctionMetricsCard, type AuctionMetricsData } from '@/components/blockchain/AuctionMetricsCard';
import { TransferHistory, type TransferHistoryData } from '@/components/blockchain/TransferHistory';
import { TokenActionHistory, type TokenActionHistoryData } from '@/components/blockchain/TokenActionHistory';
import { TokenQueryCard, type TokenQueryData } from '@/components/blockchain/TokenQueryCard';
import { NFTQueryCard, type NFTQueryData } from '@/components/blockchain/NFTQueryCard';
import { Card } from '@/components/shared/Card';

/**
 * Tool result part from MCP - matches Vercel AI SDK structure
 */
export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
}

/**
 * Props for the ToolResultRenderer
 */
export interface ToolResultRendererProps {
  toolResult: ToolResultPart;
  onSignDeploy?: (unsignedDeploy: UnsignedDeployData) => void;
  onCancelDeploy?: (unsignedDeploy: UnsignedDeployData) => void;
  onViewExplorer?: (deployHash: string) => void;
  network?: 'testnet' | 'mainnet';
  signedDeploys?: Map<string, { isLoading: boolean; isSigned: boolean; isCancelled?: boolean; deployHash?: string; error?: string; }>;
}

/**
 * ToolResultRenderer - Maps MCP tool results to appropriate blockchain UI components
 *
 * This is the core component for generative UI - it takes raw tool results
 * and renders them as rich, interactive blockchain components.
 */
export function ToolResultRenderer({
  toolResult,
  onSignDeploy,
  onCancelDeploy,
  onViewExplorer,
  network = 'testnet',
  signedDeploys,
}: ToolResultRendererProps) {
  const { toolName, result, isError } = toolResult;

  // Handle errors with the generic card
  if (isError) {
    return (
      <ToolResultCard
        toolName={toolName}
        result={typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
        isError={true}
      />
    );
  }

  // Type guard for result object
  const data = result as Record<string, unknown>;

  // ============================================================================
  // BALANCE QUERIES
  // ============================================================================
  if (toolName === 'casper_get_balance') {
    // Validate that we have actual data - MCP returns public_key, balance_cspr, balance_motes, network
    const balanceCspr = data.balance_cspr;
    const publicKey = data.public_key;

    if (balanceCspr === undefined || publicKey === undefined) {
      return (
        <ToolResultCard
          toolName={toolName}
          result="Balance query returned incomplete data. Please try again."
          isError={true}
        />
      );
    }

    return (
      <BalanceCard
        balance={String(balanceCspr)}
        usdValue={data.usd_value ? String(data.usd_value) : undefined}
        address={String(publicKey)}
      />
    );
  }

  // ============================================================================
  // STAKING INFO
  // ============================================================================
  if (toolName === 'casper_get_staking_info') {
    const delegations = (data.delegations as Delegation[]) || [];
    return (
      <StakingInfoCard
        delegator={String(data.delegator || data.account || '')}
        delegations={delegations}
        total_staked_cspr={String(data.total_staked_cspr || '0')}
      />
    );
  }

  // ============================================================================
  // TOKEN BALANCES
  // ============================================================================
  if (toolName === 'casper_get_account_tokens') {
    const tokens = (data.tokens as TokenBalance[]) || [];
    return (
      <TokenBalanceList
        account={String(data.account || '')}
        tokens={tokens}
      />
    );
  }

  // ============================================================================
  // DEPLOY STATUS
  // ============================================================================
  if (toolName === 'casper_get_deploy' || toolName === 'casper_check_deploy_status') {
    const deployData: DeployStatusData = {
      deploy_hash: String(data.deploy_hash || ''),
      status: (data.status as 'pending' | 'success' | 'failed') || 'pending',
      block_hash: data.block_hash ? String(data.block_hash) : undefined,
      block_height: data.block_height as number | undefined,
      cost_motes: data.cost_motes ? String(data.cost_motes) : undefined,
      cost_cspr: data.cost_cspr ? String(data.cost_cspr) : undefined,
      timestamp: data.timestamp ? String(data.timestamp) : undefined,
      error_message: data.error_message ? String(data.error_message) : undefined,
      execution_type: data.execution_type ? String(data.execution_type) : undefined,
    };

    return (
      <DeployStatusCard
        deploy={deployData}
        network={network}
        onViewInExplorer={onViewExplorer ? () => onViewExplorer(deployData.deploy_hash) : undefined}
      />
    );
  }

  // ============================================================================
  // DEPLOY HISTORY
  // ============================================================================
  if (toolName === 'casper_get_account_deploys') {
    const deploys = (data.deploys as DeployStatusData[]) || [];
    return (
      <DeployHistoryList
        account={String(data.account || '')}
        deploys={deploys}
        network={network}
      />
    );
  }

  // ============================================================================
  // DEX QUERIES
  // ============================================================================
  if (toolName === 'casper_query_dex') {
    const queryType = data.query_type as string;

    // Pool info, reserves, LP balance, or swap quote
    if (['pool', 'reserves', 'lp_balance', 'swap_quote'].includes(queryType)) {
      const poolData: DexPoolData = {
        contract_address: String(data.contract_address || ''),
        pool_id: String(data.pool_id || ''),
        token_a: String(data.token_a || ''),
        token_b: String(data.token_b || ''),
        token_a_name: data.token_a_name ? String(data.token_a_name) : undefined,
        token_b_name: data.token_b_name ? String(data.token_b_name) : undefined,
        reserve_a: String(data.reserve_a || '0'),
        reserve_b: String(data.reserve_b || '0'),
        total_lp_supply: String(data.total_lp_supply || '0'),
        fee_bps: Number(data.fee_bps || 30),
        user_lp_balance: data.user_lp_balance ? String(data.user_lp_balance) : undefined,
        swap_quote: data.swap_quote as DexPoolData['swap_quote'],
      };

      return <DexPoolCard pool={poolData} />;
    }
  }

  // ============================================================================
  // DAO QUERIES
  // ============================================================================
  if (toolName === 'casper_query_dao') {
    const queryType = data.query_type as string;

    // Single proposal
    if (queryType === 'proposal') {
      const proposalData: DaoProposalData = {
        contract_address: String(data.contract_address || ''),
        proposal_id: String(data.proposal_id || ''),
        title: String(data.title || 'Untitled Proposal'),
        description: String(data.description || ''),
        proposer: String(data.proposer || ''),
        status: (data.status as DaoProposalData['status']) || 'pending',
        votes_for: String(data.votes_for || '0'),
        votes_against: String(data.votes_against || '0'),
        quorum: String(data.quorum || '0'),
        quorum_reached: Boolean(data.quorum_reached),
        end_time: String(data.end_time || ''),
        start_time: data.start_time ? String(data.start_time) : undefined,
        execution_time: data.execution_time ? String(data.execution_time) : undefined,
        user_voting_power: data.user_voting_power ? String(data.user_voting_power) : undefined,
        user_vote: data.user_vote as DaoProposalData['user_vote'],
      };

      return <DaoProposalCard proposal={proposalData} />;
    }

    // Multiple proposals
    if (queryType === 'proposals' || queryType === 'list_proposals') {
      const proposals = (data.proposals as DaoProposalData[]) || [];
      return (
        <DaoProposalList
          contractAddress={String(data.contract_address || '')}
          proposals={proposals}
        />
      );
    }

    // Voting power
    if (queryType === 'voting_power') {
      return (
        <ToolResultCard
          toolName={`DAO Voting Power`}
          result={`Your voting power: ${data.voting_power || '0'} votes`}
        />
      );
    }
  }

  // ============================================================================
  // UNSIGNED DEPLOYS (Transaction Builders)
  // These are returned by all "build" tools that require wallet signing
  // ============================================================================
  if (data.unsigned_deploy || data.type === 'unsigned_deploy') {
    // Build description for token deploys
    let description = data.description ? String(data.description) : undefined;
    if (!description && data.token_name && data.token_symbol) {
      description = `Deploy ${data.token_name} (${data.token_symbol}) token`;
      if (data.initial_supply) {
        description += ` with initial supply of ${data.initial_supply}`;
      }
    }

    // Normalize signer/from field - MCP tools use different field names:
    // - from: CSPR transfers, token transfers
    // - sender: generic
    // - deployer: token/NFT deploys
    // - minter: token/NFT minting
    // - burner: token burning
    // - owner: token approvals
    // - spender: transfer_from operations (the signer using allowance)
    // - caller: burn_from operations
    // - current_owner: ownership transfers
    // - from_public_key: NFT operations
    const signerAddress = String(
      data.from ||
      data.sender ||
      data.deployer ||
      data.minter ||
      data.burner ||
      data.owner ||
      data.spender ||
      data.caller ||
      data.current_owner ||
      data.from_public_key ||
      ''
    );

    // Normalize recipient/to field
    const recipientAddress = data.to
      ? String(data.to)
      : data.recipient
        ? String(data.recipient)
        : data.new_owner
          ? String(data.new_owner)
          : undefined;

    // Normalize amount field
    const amountValue = data.amount
      ? String(data.amount)
      : data.amount_cspr
        ? String(data.amount_cspr)
        : data.initial_supply
          ? String(data.initial_supply)
          : undefined;

    const unsignedData: UnsignedDeployData = {
      type: String(data.deploy_type || data.type || 'transaction'),
      from: signerAddress,
      to: recipientAddress,
      amount: amountValue,
      network: String(data.network || network),
      unsigned_deploy: data.unsigned_deploy as object || data,
      contract_address: data.contract_address ? String(data.contract_address) : undefined,
      token_id: data.token_id ? String(data.token_id) : undefined,
      pool_id: data.pool_id ? String(data.pool_id) : undefined,
      proposal_id: data.proposal_id ? String(data.proposal_id) : undefined,
      description: description,
    };

    // Look up signing state for this deploy
    const deploy = unsignedData.unsigned_deploy as any;
    const deployKey = deploy?.hash || JSON.stringify(deploy).substring(0, 64);
    const signState = signedDeploys?.get(deployKey);

    return (
      <UnsignedDeployCard
        data={unsignedData}
        onSign={onSignDeploy ? () => onSignDeploy(unsignedData) : undefined}
        onCancel={onCancelDeploy ? () => onCancelDeploy(unsignedData) : undefined}
        isLoading={signState?.isLoading || false}
        isSigned={signState?.isSigned || false}
        isCancelled={signState?.isCancelled || false}
        deployHash={signState?.deployHash}
        network={network}
      />
    );
  }

  // ============================================================================
  // NFT QUERIES (cspr.cloud)
  // ============================================================================

  // NFT search results - list of NFTs
  if (toolName === 'casper_get_nfts' || toolName === 'casper_get_account_nfts') {
    const nftsData = (data.nfts as Array<{
      token_id: string;
      contract_package_hash: string;
      owner_hash?: string;
      metadata?: Record<string, unknown>;
    }>) || [];

    // Transform to NFTGallery format
    const nfts: NFT[] = nftsData.map((nft) => ({
      tokenId: String(nft.token_id),
      name: (nft.metadata?.name as string) || `Token #${nft.token_id}`,
      imageUrl: (nft.metadata?.image as string) || (nft.metadata?.asset as string) || '/placeholder-nft.png',
      collection: nft.contract_package_hash?.slice(0, 12) + '...',
      contractAddress: nft.contract_package_hash,
      metadataUri: nft.metadata?.token_uri as string,
      attributes: nft.metadata?.attributes as Record<string, string>,
    }));

    if (nfts.length === 0) {
      return (
        <Card padding="md">
          <p className="text-muted-foreground text-center py-4">
            No NFTs found{data.account ? ` for account ${String(data.account).slice(0, 12)}...` : ''}
          </p>
        </Card>
      );
    }

    return <NFTGallery nfts={nfts} />;
  }

  // Single NFT details
  if (toolName === 'casper_get_nft') {
    const nftDetailData: NFTDetailData = {
      token_id: String(data.token_id || ''),
      contract_package_hash: String(data.contract_package_hash || ''),
      owner_hash: String(data.owner_hash || ''),
      metadata: data.metadata as NFTDetailData['metadata'],
    };

    return <NFTDetailCard data={nftDetailData} network={network} />;
  }

  // NFT action history
  if (toolName === 'casper_get_nft_actions' || toolName === 'casper_get_account_nft_actions') {
    const nftActionData: NFTActionHistoryData = {
      total_count: (data.total_count as number) || 0,
      page_count: (data.page_count as number) || 1,
      current_page: (data.current_page as number) || 1,
      account: data.account as string | undefined,
      filters: data.filters as NFTActionHistoryData['filters'],
      actions: (data.actions as NFTActionHistoryData['actions']) || [],
    };

    return <NFTActionHistory data={nftActionData} network={network} />;
  }

  // ============================================================================
  // VALIDATOR QUERIES (cspr.cloud)
  // ============================================================================

  // Current era validators list
  if (toolName === 'casper_get_current_validators') {
    const validatorsData = (data.validators as Array<{
      public_key: string;
      total_stake_cspr: number;
      fee: number;
      delegators_number?: number;
      is_active?: boolean;
    }>) || [];

    // Transform to ValidatorList format
    const validators: Validator[] = validatorsData.map((v) => ({
      publicKey: v.public_key,
      name: undefined, // Could be enhanced with validator metadata
      totalStake: `${v.total_stake_cspr?.toFixed(2) || '0'} CSPR`,
      delegationRate: v.fee || 0,
      performance: undefined,
      isSelfDelegated: false,
    }));

    if (validators.length === 0) {
      return (
        <Card padding="md">
          <p className="text-muted-foreground text-center py-4">No validators found</p>
        </Card>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm">Current Era Validators</h3>
          <span className="text-xs text-muted-foreground">Era: {String(data.current_era || 'N/A')}</span>
        </div>
        <ValidatorList validators={validators} />
      </div>
    );
  }

  // RPC validators (legacy tool)
  if (toolName === 'casper_get_validators') {
    const validatorsData = (data.validators as Array<{
      public_key: string;
      staked_amount?: string;
      delegation_rate?: number;
    }>) || [];

    const validators: Validator[] = validatorsData.map((v) => ({
      publicKey: v.public_key,
      totalStake: v.staked_amount || '0',
      delegationRate: v.delegation_rate || 0,
    }));

    return <ValidatorList validators={validators} />;
  }

  // Validator reward history
  if (toolName === 'casper_get_validator_rewards') {
    const rewardHistoryData: ValidatorRewardHistoryData = {
      validator: String(data.validator || ''),
      total_count: (data.total_count as number) || 0,
      page_count: (data.page_count as number) || 1,
      current_page: (data.current_page as number) || 1,
      total_earnings_cspr: (data.total_earnings_cspr as number) || 0,
      rewards: (data.rewards as ValidatorRewardHistoryData['rewards']) || [],
    };

    return <ValidatorRewardHistory data={rewardHistoryData} network={network} />;
  }

  // Validator block history
  if (toolName === 'casper_get_validator_blocks') {
    const blockHistoryData: ValidatorBlockHistoryData = {
      validator: String(data.validator || ''),
      total_count: (data.total_count as number) || 0,
      page_count: (data.page_count as number) || 1,
      current_page: (data.current_page as number) || 1,
      total_deploys: (data.total_deploys as number) || 0,
      blocks: (data.blocks as ValidatorBlockHistoryData['blocks']) || [],
    };

    return <ValidatorBlockHistory data={blockHistoryData} network={network} />;
  }

  // Network auction metrics
  if (toolName === 'casper_get_auction_metrics') {
    const auctionData: AuctionMetricsData = {
      current_era_id: (data.current_era_id as number) || 0,
      total_active_era_stake_cspr: (data.total_active_era_stake_cspr as number) || 0,
      active_validator_number: (data.active_validator_number as number) || 0,
      total_bids_number: (data.total_bids_number as number) || 0,
      active_bids_number: (data.active_bids_number as number) || 0,
    };

    return <AuctionMetricsCard data={auctionData} />;
  }

  // ============================================================================
  // TRANSFER HISTORY (cspr.cloud)
  // ============================================================================

  if (toolName === 'casper_get_account_transfers') {
    const transferHistoryData: TransferHistoryData = {
      account: String(data.account || ''),
      total_count: (data.total_count as number) || 0,
      page_count: (data.page_count as number) || 1,
      current_page: (data.current_page as number) || 1,
      page_summary: data.page_summary as TransferHistoryData['page_summary'],
      transfers: (data.transfers as TransferHistoryData['transfers']) || [],
    };

    return <TransferHistory data={transferHistoryData} network={network} />;
  }

  // ============================================================================
  // TOKEN ACTION HISTORY (cspr.cloud)
  // ============================================================================

  if (toolName === 'casper_get_token_actions' || toolName === 'casper_get_account_token_actions') {
    const tokenActionData: TokenActionHistoryData = {
      total_count: (data.total_count as number) || 0,
      page_count: (data.page_count as number) || 1,
      current_page: (data.current_page as number) || 1,
      account: data.account as string | undefined,
      filters: data.filters as TokenActionHistoryData['filters'],
      actions: (data.actions as TokenActionHistoryData['actions']) || [],
    };

    return <TokenActionHistory data={tokenActionData} network={network} />;
  }

  // ============================================================================
  // TOKEN CONTRACT QUERIES (RPC)
  // ============================================================================

  if (toolName === 'casper_query_token') {
    const queryType = data.query_type as string;
    const tokenQueryData: TokenQueryData = {
      query_type: queryType as TokenQueryData['query_type'],
      contract_address: String(data.contract_address || ''),
      ...(queryType === 'metadata' && {
        name: String(data.name || ''),
        symbol: String(data.symbol || ''),
        decimals: (data.decimals as number) || 0,
        total_supply: String(data.total_supply || '0'),
      }),
      ...(queryType === 'balance' && {
        owner: String(data.owner || ''),
        balance: String(data.balance || '0'),
      }),
      ...(queryType === 'supply' && {
        total_supply: String(data.total_supply || '0'),
      }),
      ...(queryType === 'allowance' && {
        owner: String(data.owner || ''),
        spender: String(data.spender || ''),
        allowance: String(data.allowance || '0'),
      }),
    } as TokenQueryData;

    return <TokenQueryCard data={tokenQueryData} network={network} />;
  }

  // ============================================================================
  // NFT CONTRACT QUERIES (RPC)
  // ============================================================================

  if (toolName === 'casper_query_nft') {
    // Ensure query_type exists, otherwise fall back to generic card
    if (!data.query_type) {
      return (
        <ToolResultCard
          toolName={toolName}
          result={typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
        />
      );
    }
    const queryType = data.query_type as string;
    const nftQueryData: NFTQueryData = {
      query_type: queryType as NFTQueryData['query_type'],
      contract_address: String(data.contract_address || ''),
      ...(queryType === 'collection_info' && {
        name: String(data.name || ''),
        symbol: String(data.symbol || ''),
        base_uri: String(data.base_uri || ''),
        max_supply: String(data.max_supply || '0'),
        total_supply: String(data.total_supply || '0'),
        minting_mode: String(data.minting_mode || 'restricted'),
      }),
      ...(queryType === 'owner' && {
        token_id: String(data.token_id || ''),
        owner: String(data.owner || ''),
      }),
      ...(queryType === 'balance' && {
        owner: String(data.owner || ''),
        balance: String(data.balance || '0'),
      }),
      ...(queryType === 'token_uri' && {
        token_id: String(data.token_id || ''),
        token_uri: String(data.token_uri || ''),
      }),
      ...(queryType === 'metadata' && {
        token_id: String(data.token_id || ''),
        name: String(data.name || ''),
        token_uri: String(data.token_uri || ''),
        owner: String(data.owner || ''),
      }),
      ...(queryType === 'approved' && {
        token_id: String(data.token_id || ''),
        approved: data.approved ? String(data.approved) : null,
      }),
    } as NFTQueryData;

    return <NFTQueryCard data={nftQueryData} network={network} />;
  }

  // ============================================================================
  // FALLBACK - Generic ToolResultCard for unknown tools
  // ============================================================================
  return (
    <ToolResultCard
      toolName={toolName}
      result={typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
    />
  );
}

/**
 * Renders multiple tool results in a list
 */
export interface ToolResultListProps {
  toolResults: ToolResultPart[];
  onSignDeploy?: (unsignedDeploy: UnsignedDeployData) => void;
  onCancelDeploy?: (unsignedDeploy: UnsignedDeployData) => void;
  onViewExplorer?: (deployHash: string) => void;
  network?: 'testnet' | 'mainnet';
  signedDeploys?: Map<string, { isLoading: boolean; isSigned: boolean; isCancelled?: boolean; deployHash?: string; error?: string; }>;
}

export function ToolResultList({
  toolResults,
  onSignDeploy,
  onCancelDeploy,
  onViewExplorer,
  network = 'testnet',
  signedDeploys,
}: ToolResultListProps) {
  if (toolResults.length === 0) return null;

  return (
    <div className="space-y-3">
      {toolResults.map((toolResult) => (
        <ToolResultRenderer
          key={toolResult.toolCallId}
          toolResult={toolResult}
          onSignDeploy={onSignDeploy}
          onCancelDeploy={onCancelDeploy}
          onViewExplorer={onViewExplorer}
          network={network}
          signedDeploys={signedDeploys}
        />
      ))}
    </div>
  );
}

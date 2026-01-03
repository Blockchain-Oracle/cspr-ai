'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface ToolCategory {
  name: string;
  icon: string;
  accent: string;
  actions: Array<{
    title: string;
    label: string;
    action: string;
  }>;
}

export interface SuggestedActionsProps {
  tools: Tool[];
  onActionClick: (prompt: string) => void;
  userAddress?: string;
}

export function SuggestedActions({ tools, onActionClick, userAddress }: SuggestedActionsProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const categories = categorizeTools(tools, userAddress);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const actionScrollRef = useRef<HTMLDivElement>(null);

  if (categories.length === 0) {
    return null;
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const scrollAmount = 200;
    categoryScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const scrollActions = (direction: 'left' | 'right') => {
    if (!actionScrollRef.current) return;
    const scrollAmount = 300;
    actionScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="w-full max-w-full space-y-6 px-2 sm:px-4 md:px-0">
      {/* Category Pills with Navigation */}
      <div className="relative w-full max-w-full">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => scrollCategories('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 shadow-md hover:bg-accent transition-colors hidden sm:flex items-center justify-center"
          aria-label="Scroll categories left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => scrollCategories('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 shadow-md hover:bg-accent transition-colors hidden sm:flex items-center justify-center"
          aria-label="Scroll categories right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <div
          ref={categoryScrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 snap-x snap-mandatory px-8 sm:px-10 scrollbar-hide"
        >
          {categories.map((category, index) => (
            <motion.button
              key={category.name}
              type="button"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              onClick={(e) => {
                e.preventDefault();
                setActiveCategory(index);
              }}
              className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border text-xs sm:text-sm font-medium whitespace-nowrap transition-all snap-start snap-center shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeCategory === index
                  ? 'bg-secondary/80 border-primary shadow-sm backdrop-blur-sm'
                  : 'bg-card/50 border-border/50 hover:border-primary/50 hover:bg-secondary/50'
              }`}
              style={
                activeCategory === index
                  ? {
                      borderColor: category.accent,
                      boxShadow: `0 0 20px -10px ${category.accent}`
                    }
                  : undefined
              }
            >
              <span
                style={activeCategory === index ? { color: category.accent } : undefined}
                className={`text-lg transition-colors ${activeCategory === index ? '' : 'text-muted-foreground'}`}
              >
                {category.icon}
              </span>
              <span className={activeCategory === index ? 'text-foreground' : 'text-muted-foreground'}>
                {category.name}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeCategory === index
                  ? 'bg-background/50 text-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {category.actions.length}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Action Cards with Navigation */}
      <div className="relative w-full max-w-full">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => scrollActions('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 shadow-md hover:bg-accent transition-colors hidden sm:flex items-center justify-center"
          aria-label="Scroll actions left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => scrollActions('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 shadow-md hover:bg-accent transition-colors hidden sm:flex items-center justify-center"
          aria-label="Scroll actions right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <div
          ref={actionScrollRef}
          className="overflow-x-auto pb-4 px-8 sm:px-10 scrollbar-hide"
        >
          <div className="flex gap-3 sm:gap-4">
            <AnimatePresence mode="wait">
              {categories[activeCategory].actions.map((suggestedAction, index) => (
                <motion.div
                  key={`${suggestedAction.title}-${index}`}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: 0.05 * index, type: "spring", stiffness: 300, damping: 30 }}
                  className="shrink-0 w-[240px] sm:w-[280px] md:w-[320px] snap-start snap-center"
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.preventDefault();
                      onActionClick(suggestedAction.action);
                    }}
                    className="relative h-full w-full text-left border border-border/60 rounded-xl p-4 sm:p-5 bg-card/40 hover:bg-accent/10 hover:border-primary/40 transition-all group overflow-hidden backdrop-blur-sm shadow-sm hover:shadow-md"
                  >
                    {/* Gradient Background Effect on Hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br from-transparent via-transparent to-current"
                      style={{ color: categories[activeCategory].accent }}
                    />

                    {/* Accent bar */}
                    <div
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-r opacity-50 group-hover:opacity-100 transition-all group-hover:w-1.5"
                      style={{ backgroundColor: categories[activeCategory].accent }}
                    />

                    {/* Content */}
                    <div className="pl-2 sm:pl-3 group-hover:pl-3 sm:group-hover:pl-4 transition-all space-y-2 sm:space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground text-sm sm:text-base leading-tight">
                          {suggestedAction.title}
                        </span>
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          whileHover={{ opacity: 1, x: 0 }}
                          className="shrink-0 text-primary"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-5"
                            style={{ color: categories[activeCategory].accent }}
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </motion.div>
                      </div>
                      <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">
                        {suggestedAction.label}
                      </p>
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-medium text-muted-foreground/80 pt-4 border-t border-border/40"
      >
        <span className="flex items-center gap-1 sm:gap-1.5 bg-secondary/50 px-2 sm:px-3 py-1 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5 text-primary"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {categories.reduce((sum, cat) => sum + cat.actions.length, 0)}+ Actions Available
        </span>
      </motion.div>
    </div>
  );
}

function categorizeTools(tools: Tool[], userAddress?: string): ToolCategory[] {
  const categories: Record<
    string,
    { tools: Tool[]; icon: string; accent: string }
  > = {
    account: { tools: [], icon: '👤', accent: '#06B6D4' },      // Cyan
    blockchain: { tools: [], icon: '⛓️', accent: '#8B5CF6' },    // Violet
    tokens: { tools: [], icon: '🪙', accent: '#F59E0B' },       // Amber
    nfts: { tools: [], icon: '🖼️', accent: '#EC4899' },         // Pink
    defi: { tools: [], icon: '💱', accent: '#10B981' },         // Emerald
    contracts: { tools: [], icon: '📜', accent: '#6366F1' },    // Indigo
  };

  tools.forEach((tool) => {
    const name = tool.name.toLowerCase();
    const description = tool.description?.toLowerCase() || '';

    // Skip signing/submission tools (utility tools)
    if (name.includes('sign') || name.includes('submit')) {
      return;
    }

    // Account & Balance
    if (
      name.includes('balance') ||
      name.includes('account') ||
      name.includes('staking') ||
      name.includes('delegation') ||
      name.includes('transfer')
    ) {
      categories.account.tools.push(tool);
    }
    // Blockchain (Validators, Network, Auction)
    else if (
      name.includes('validator') ||
      name.includes('auction') ||
      name.includes('block') ||
      name.includes('deploy') ||
      name.includes('network')
    ) {
      categories.blockchain.tools.push(tool);
    }
    // Tokens (CEP-18)
    else if (
      name.includes('token') && !name.includes('nft')
    ) {
      categories.tokens.tools.push(tool);
    }
    // NFTs (CEP-78)
    else if (
      name.includes('nft')
    ) {
      categories.nfts.tools.push(tool);
    }
    // DeFi (DEX, DAO)
    else if (
      name.includes('dex') ||
      name.includes('dao') ||
      name.includes('pool') ||
      name.includes('swap') ||
      name.includes('liquidity')
    ) {
      categories.defi.tools.push(tool);
    }
    // Contracts (everything else)
    else {
      categories.contracts.tools.push(tool);
    }
  });

  return Object.entries(categories)
    .filter(([_, data]) => data.tools.length > 0)
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      icon: data.icon,
      accent: data.accent,
      actions: data.tools.map((tool) => ({
        title: formatToolName(tool.name),
        label: generateLabel(tool.name, userAddress),
        action: generatePrompt(tool, userAddress),
      })),
    }));
}

function formatToolName(name: string): string {
  // Remove casper_ prefix and convert to title case
  const withoutPrefix = name.replace(/^casper_/, '');
  return withoutPrefix
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateLabel(name: string, userAddress?: string): string {
  const formatted = name.replace(/_/g, ' ').replace(/^casper /, '');

  if (name.includes('get_balance')) {
    return userAddress ? 'Check your CSPR balance' : 'Query account balance';
  }
  if (name.includes('get_staking')) {
    return 'View delegation and staking info';
  }
  if (name.includes('get_validators')) {
    return 'Explore active validators';
  }
  if (name.includes('build_transfer')) {
    return 'Send CSPR to another account';
  }
  if (name.includes('build_delegation')) {
    return 'Stake CSPR with a validator';
  }
  if (name.startsWith('query_')) {
    return `view ${formatted.replace('query ', '')}`;
  }
  if (name.startsWith('get_')) {
    return `view ${formatted.replace('get ', '')}`;
  }
  if (name.startsWith('build_')) {
    return `create ${formatted.replace('build ', '')}`;
  }

  return formatted;
}

function generatePrompt(tool: Tool, userAddress?: string): string {
  const name = tool.name;

  // Deployed contract addresses on testnet (pre-populated for easy testing)
  const CONTRACT_ADDRESSES = {
    token: 'hash-810963e7e989ccc987683a2d1bcb4e17762f6511f06c306393dfd84c4db10995',
    nft: 'hash-5536ec2a8dbfd8d10328dec3b424df9b6c3fe8ac2af43910aa33f102d26bb33c',
    dao: 'hash-f41a989359447ae236015956e9d3d0f80e0c92112ed5b6b12a1a4eef14998d8e',
    dex: 'hash-75bc6d255bd4173b4968776b6638d02d170d445f42e7c48e89bf99725426899a',
  };

  // Example validator (top active validator on testnet)
  const EXAMPLE_VALIDATOR = '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca';

  // Example deploy hash for testing
  const EXAMPLE_DEPLOY = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';

  // Account queries with user's address if available
  if (name === 'casper_get_balance') {
    return userAddress
      ? `What is the balance of ${userAddress}?`
      : `What is the balance of ${EXAMPLE_VALIDATOR}?`;
  }
  if (name === 'casper_get_staking_info') {
    return userAddress
      ? `Show me staking info for ${userAddress}`
      : `Show me staking info for ${EXAMPLE_VALIDATOR}`;
  }
  if (name.includes('get_account_transfers')) {
    return userAddress
      ? `Get transfer history for ${userAddress}`
      : `Get transfer history for ${EXAMPLE_VALIDATOR}`;
  }
  if (name.includes('get_account_deploys')) {
    return userAddress
      ? `Get deploy history for ${userAddress}`
      : `Get deploy history for ${EXAMPLE_VALIDATOR}`;
  }

  // Deploy/Transaction queries
  if (name === 'casper_get_deploy') {
    return `Get details for deploy ${EXAMPLE_DEPLOY}`;
  }
  if (name === 'casper_check_deploy_status' || name === 'casper_get_deploy_status') {
    return `Check status of deploy ${EXAMPLE_DEPLOY}`;
  }

  // Validator queries
  if (name === 'casper_get_current_validators') {
    return 'Show me the top 20 active validators';
  }
  if (name === 'casper_get_validator_rewards') {
    return `Show rewards for validator ${EXAMPLE_VALIDATOR}`;
  }
  if (name === 'casper_get_validator_blocks') {
    return `Show recent blocks from validator ${EXAMPLE_VALIDATOR}`;
  }

  // Network queries
  if (name === 'casper_get_auction_metrics') {
    return 'What are the current auction metrics?';
  }

  // Transfer operations
  if (name === 'casper_build_transfer') {
    return userAddress
      ? `Build a transfer of 100 CSPR from ${userAddress} to ${EXAMPLE_VALIDATOR}`
      : `Help me build a CSPR transfer`;
  }
  if (name === 'casper_build_delegation') {
    return userAddress
      ? `Build a delegation of 500 CSPR from ${userAddress} to validator ${EXAMPLE_VALIDATOR}`
      : `Help me stake CSPR with a validator`;
  }

  // Token operations with pre-populated contract address
  if (name === 'casper_query_token') {
    return `Query token metadata for ${CONTRACT_ADDRESSES.token}`;
  }
  if (name === 'casper_build_token_transfer') {
    return userAddress
      ? `Build token transfer from ${userAddress} using contract ${CONTRACT_ADDRESSES.token}`
      : `Build a token transfer using contract ${CONTRACT_ADDRESSES.token}`;
  }
  if (name === 'casper_build_token_mint') {
    return `Build token mint using contract ${CONTRACT_ADDRESSES.token}`;
  }
  if (name === 'casper_build_token_burn') {
    return `Build token burn using contract ${CONTRACT_ADDRESSES.token}`;
  }
  if (name === 'casper_build_token_approve') {
    return `Build token approval using contract ${CONTRACT_ADDRESSES.token}`;
  }

  // NFT operations with pre-populated contract address
  if (name === 'casper_query_nft') {
    return `Query NFT collection info for ${CONTRACT_ADDRESSES.nft}`;
  }
  if (name === 'casper_build_nft_mint') {
    return userAddress
      ? `Build NFT mint to ${userAddress} using contract ${CONTRACT_ADDRESSES.nft}`
      : `Build NFT mint using contract ${CONTRACT_ADDRESSES.nft}`;
  }
  if (name === 'casper_build_nft_transfer') {
    return `Build NFT transfer using contract ${CONTRACT_ADDRESSES.nft}`;
  }
  if (name === 'casper_build_nft_burn') {
    return `Build NFT burn using contract ${CONTRACT_ADDRESSES.nft}`;
  }
  if (name === 'casper_build_nft_approve') {
    return `Build NFT approval using contract ${CONTRACT_ADDRESSES.nft}`;
  }

  // DAO operations with pre-populated contract address
  if (name === 'casper_query_dao') {
    return `Query DAO configuration for ${CONTRACT_ADDRESSES.dao}`;
  }
  if (name === 'casper_build_dao_propose') {
    return `Build a DAO proposal using contract ${CONTRACT_ADDRESSES.dao}`;
  }
  if (name === 'casper_build_dao_vote') {
    return `Build a DAO vote using contract ${CONTRACT_ADDRESSES.dao}`;
  }
  if (name === 'casper_build_dao_finalize') {
    return `Finalize DAO proposal using contract ${CONTRACT_ADDRESSES.dao}`;
  }
  if (name === 'casper_build_dao_execute') {
    return `Execute DAO proposal using contract ${CONTRACT_ADDRESSES.dao}`;
  }

  // DEX operations with pre-populated contract address
  if (name === 'casper_query_dex') {
    return `Query DEX pools for ${CONTRACT_ADDRESSES.dex}`;
  }
  if (name === 'casper_build_dex_create_pool') {
    return `Create liquidity pool using DEX ${CONTRACT_ADDRESSES.dex}`;
  }
  if (name === 'casper_build_dex_add_liquidity') {
    return `Add liquidity using DEX ${CONTRACT_ADDRESSES.dex}`;
  }
  if (name === 'casper_build_dex_swap') {
    return `Build a token swap using DEX ${CONTRACT_ADDRESSES.dex}`;
  }
  if (name === 'casper_build_dex_remove_liquidity') {
    return `Remove liquidity using DEX ${CONTRACT_ADDRESSES.dex}`;
  }

  // Generic patterns for any remaining tools
  if (name.startsWith('casper_build_')) {
    const what = name.replace('casper_build_', '').replace(/_/g, ' ');
    return `Help me build a ${what}`;
  }

  if (name.startsWith('casper_get_')) {
    const what = name.replace('casper_get_', '').replace(/_/g, ' ');
    return `Show me ${what}`;
  }

  if (name.startsWith('casper_query_')) {
    const what = name.replace('casper_query_', '').replace(/_/g, ' ');
    return `Query ${what} information`;
  }

  return formatToolName(name);
}

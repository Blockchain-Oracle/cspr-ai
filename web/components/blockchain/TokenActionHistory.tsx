'use client';

import * as React from 'react';
import { ArrowRight, Flame, Sparkles, CheckCircle, ArrowRightLeft, ExternalLink, Copy, Check } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

export interface TokenAction {
  action_type: string;
  action_type_id: number;
  direction?: 'sent' | 'received';
  from_hash: string;
  to_hash: string;
  amount: string;
  token_name?: string;
  contract_package_hash: string;
  deploy_hash: string;
  block_height: number;
  timestamp: string;
}

export interface TokenActionHistoryData {
  total_count: number;
  page_count: number;
  current_page: number;
  account?: string;
  filters?: {
    contract_package_hash?: string;
    account_hash?: string;
    ft_action_type_id?: number;
  };
  actions: TokenAction[];
}

export interface TokenActionHistoryProps {
  data: TokenActionHistoryData;
  network?: 'testnet' | 'mainnet';
  onViewDeploy?: (deployHash: string) => void;
  className?: string;
}

function getActionIcon(actionType: string) {
  switch (actionType.toLowerCase()) {
    case 'mint':
      return Sparkles;
    case 'burn':
      return Flame;
    case 'approve':
      return CheckCircle;
    case 'transferfrom':
      return ArrowRightLeft;
    case 'transfer':
    default:
      return ArrowRight;
  }
}

function getActionColor(actionType: string) {
  switch (actionType.toLowerCase()) {
    case 'mint':
      return 'text-green-500 bg-green-500/10 border-green-500/20';
    case 'burn':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'approve':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    case 'transfer':
    case 'transferfrom':
    default:
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  }
}

function getDirectionLabel(action: TokenAction, account?: string) {
  if (action.direction === 'sent') return '➡️ Sent';
  if (action.direction === 'received') return '⬅️ Received';

  switch (action.action_type.toLowerCase()) {
    case 'mint':
      return '✨ Minted';
    case 'burn':
      return '🔥 Burned';
    case 'approve':
      return '✅ Approved';
    case 'transfer':
    case 'transferfrom':
      return '🔄 Transferred';
    default:
      return action.action_type;
  }
}

export function TokenActionHistory({
  data,
  network = 'testnet',
  onViewDeploy,
  className,
}: TokenActionHistoryProps) {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const explorerBaseUrl = network === 'mainnet'
    ? 'https://cspr.live'
    : 'https://testnet.cspr.live';

  if (data.actions.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <ArrowRight className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground">No token actions found.</p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{data.total_count} action{data.total_count !== 1 ? 's' : ''} total</span>
        <span>Page {data.current_page} of {data.page_count}</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-green-500" />
          <span>Mint</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="h-3 w-3 text-red-500" />
          <span>Burn</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowRight className="h-3 w-3 text-blue-500" />
          <span>Transfer</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-yellow-500" />
          <span>Approve</span>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-2">
        {data.actions.map((action, index) => {
          const Icon = getActionIcon(action.action_type);
          const colorClass = getActionColor(action.action_type);
          const directionLabel = getDirectionLabel(action, data.account);
          const tokenName = action.token_name || 'Unknown Token';

          return (
            <Card key={`${action.deploy_hash}-${index}`} padding="sm" className="hover:bg-accent/20 transition-all">
              <div className="flex items-start gap-3">
                {/* Action Icon */}
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Action Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm capitalize">
                      {action.action_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {directionLabel}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate max-w-[120px]">
                      {tokenName}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="font-mono font-medium text-sm mb-1">
                    {action.amount} <span className="text-muted-foreground text-xs">(raw)</span>
                  </div>

                  {/* From/To */}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span>From:</span>
                      <span className="font-mono">
                        {action.from_hash.slice(0, 8)}...{action.from_hash.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>To:</span>
                      <span className="font-mono">
                        {action.to_hash.slice(0, 8)}...{action.to_hash.slice(-8)}
                      </span>
                    </div>
                  </div>

                  {/* Deploy Hash */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {action.deploy_hash.slice(0, 8)}...{action.deploy_hash.slice(-8)}
                    </span>
                    <button
                      onClick={() => handleCopy(action.deploy_hash)}
                      className="p-0.5 hover:bg-muted rounded transition-colors"
                    >
                      {copiedHash === action.deploy_hash ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <a
                      href={`${explorerBaseUrl}/deploy/${action.deploy_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-0.5 hover:bg-muted rounded transition-colors hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Timestamp & Block */}
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{new Date(action.timestamp).toLocaleDateString()}</div>
                  <div>{new Date(action.timestamp).toLocaleTimeString()}</div>
                  <div className="mt-1 font-mono">Block {action.block_height}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

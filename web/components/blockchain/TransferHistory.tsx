'use client';

import * as React from 'react';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Copy, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

export interface Transfer {
  transfer_id: string | number;
  direction: 'sent' | 'received';
  initiator_account_hash: string;
  to_account_hash: string;
  amount_cspr: number;
  deploy_hash: string;
  block_height: number;
  timestamp: string;
}

export interface TransferHistoryData {
  account: string;
  total_count: number;
  page_count: number;
  current_page: number;
  page_summary?: {
    total_sent_cspr: number;
    total_received_cspr: number;
    net_cspr: number;
  };
  transfers: Transfer[];
}

export interface TransferHistoryProps {
  data: TransferHistoryData;
  network?: 'testnet' | 'mainnet';
  onViewDeploy?: (deployHash: string) => void;
  className?: string;
}

export function TransferHistory({
  data,
  network = 'testnet',
  onViewDeploy,
  className,
}: TransferHistoryProps) {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const explorerBaseUrl = network === 'mainnet'
    ? 'https://cspr.live'
    : 'https://testnet.cspr.live';

  if (data.transfers.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <ArrowUpRight className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground">No native CSPR transfers found.</p>
        <p className="text-xs text-muted-foreground mt-2">
          For token transfers, use <code className="bg-muted px-1 rounded">casper_get_account_token_actions</code>
        </p>
      </Card>
    );
  }

  const { page_summary } = data;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Card */}
      {page_summary && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Page Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-500">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xl font-bold">{page_summary.total_sent_cspr.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">Sent CSPR</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-500">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xl font-bold">{page_summary.total_received_cspr.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">Received CSPR</div>
            </div>
            <div className="text-center">
              <div className={cn(
                "flex items-center justify-center gap-1 text-xl font-bold",
                page_summary.net_cspr >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {page_summary.net_cspr >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {page_summary.net_cspr >= 0 ? '+' : ''}{page_summary.net_cspr.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Net CSPR</div>
            </div>
          </div>
        </Card>
      )}

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{data.total_count} transfer{data.total_count !== 1 ? 's' : ''} total</span>
        <span>Page {data.current_page} of {data.page_count}</span>
      </div>

      {/* Transfers List */}
      <div className="space-y-2">
        {data.transfers.map((transfer, index) => {
          const isSent = transfer.direction === 'sent';
          const Icon = isSent ? ArrowUpRight : ArrowDownLeft;
          const colorClass = isSent
            ? 'text-red-500 bg-red-500/10 border-red-500/20'
            : 'text-green-500 bg-green-500/10 border-green-500/20';
          const counterparty = isSent ? transfer.to_account_hash : transfer.initiator_account_hash;

          return (
            <Card key={`${transfer.deploy_hash}-${index}`} padding="sm" className="hover:bg-accent/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Direction Icon */}
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Details */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">
                        {isSent ? 'Sent' : 'Received'}
                      </span>
                      <span className={cn("font-bold", isSent ? "text-red-500" : "text-green-500")}>
                        {isSent ? '-' : '+'}{transfer.amount_cspr.toFixed(2)} CSPR
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isSent ? 'To:' : 'From:'}{' '}
                      <span className="font-mono">
                        {counterparty.slice(0, 8)}...{counterparty.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {transfer.deploy_hash.slice(0, 8)}...{transfer.deploy_hash.slice(-8)}
                      </span>
                      <button
                        onClick={() => handleCopy(transfer.deploy_hash)}
                        className="p-0.5 hover:bg-muted rounded transition-colors"
                      >
                        {copiedHash === transfer.deploy_hash ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <a
                        href={`${explorerBaseUrl}/deploy/${transfer.deploy_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-0.5 hover:bg-muted rounded transition-colors hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <div>{new Date(transfer.timestamp).toLocaleDateString()}</div>
                  <div>{new Date(transfer.timestamp).toLocaleTimeString()}</div>
                  <div className="mt-1 font-mono">Block {transfer.block_height}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

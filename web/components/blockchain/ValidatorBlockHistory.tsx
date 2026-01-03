'use client';

import * as React from 'react';
import { Box, FileCode, Clock, ExternalLink, Copy, Check } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

export interface ValidatorBlock {
  block_hash: string;
  block_height: number;
  era_id: number;
  deploy_count: number;
  timestamp: string;
}

export interface ValidatorBlockHistoryData {
  validator: string;
  total_count: number;
  page_count: number;
  current_page: number;
  total_deploys: number;
  blocks: ValidatorBlock[];
}

export interface ValidatorBlockHistoryProps {
  data: ValidatorBlockHistoryData;
  network?: 'testnet' | 'mainnet';
  onViewBlock?: (blockHash: string) => void;
  className?: string;
}

export function ValidatorBlockHistory({
  data,
  network = 'testnet',
  onViewBlock,
  className,
}: ValidatorBlockHistoryProps) {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);
  const [copiedValidator, setCopiedValidator] = React.useState(false);

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleCopyValidator = () => {
    navigator.clipboard.writeText(data.validator);
    setCopiedValidator(true);
    setTimeout(() => setCopiedValidator(false), 2000);
  };

  const explorerBaseUrl = network === 'mainnet'
    ? 'https://cspr.live'
    : 'https://testnet.cspr.live';

  if (data.blocks.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <Box className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground">No blocks found for this validator.</p>
      </Card>
    );
  }

  // Calculate average deploys per block
  const avgDeploys = data.total_deploys / data.blocks.length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Summary */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Box className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Block Production</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-mono truncate max-w-[200px]">
                {data.validator.slice(0, 12)}...{data.validator.slice(-12)}
              </span>
              <button
                onClick={handleCopyValidator}
                className="p-0.5 hover:bg-muted rounded transition-colors"
              >
                {copiedValidator ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
              <a
                href={`${explorerBaseUrl}/validator/${data.validator}`}
                target="_blank"
                rel="noreferrer"
                className="p-0.5 hover:bg-muted rounded transition-colors hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">
              {data.total_count}
            </div>
            <div className="text-xs text-muted-foreground">Total Blocks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {data.total_deploys}
            </div>
            <div className="text-xs text-muted-foreground">Deploys (Page)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {avgDeploys.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Deploys/Block</div>
          </div>
        </div>
      </Card>

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{data.blocks.length} blocks on this page</span>
        <span>Page {data.current_page} of {data.page_count}</span>
      </div>

      {/* Blocks List */}
      <div className="space-y-2">
        {data.blocks.map((block, index) => (
          <Card key={`${block.block_hash}-${index}`} padding="sm" className="hover:bg-accent/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-xs font-bold">{block.block_height}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Block #{block.block_height}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Era {block.era_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">
                      {block.block_hash.slice(0, 8)}...{block.block_hash.slice(-8)}
                    </span>
                    <button
                      onClick={() => handleCopyHash(block.block_hash)}
                      className="p-0.5 hover:bg-muted rounded transition-colors"
                    >
                      {copiedHash === block.block_hash ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <a
                      href={`${explorerBaseUrl}/block/${block.block_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-0.5 hover:bg-muted rounded transition-colors hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 text-sm">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{block.deploy_count} deploys</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(block.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

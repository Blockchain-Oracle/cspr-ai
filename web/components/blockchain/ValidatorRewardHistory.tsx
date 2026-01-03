'use client';

import * as React from 'react';
import { Trophy, TrendingUp, Calendar, ExternalLink, Copy, Check } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

export interface ValidatorReward {
  era_id: number;
  reward_amount_cspr: number;
  timestamp: string;
}

export interface ValidatorRewardHistoryData {
  validator: string;
  total_count: number;
  page_count: number;
  current_page: number;
  total_earnings_cspr: number;
  rewards: ValidatorReward[];
}

export interface ValidatorRewardHistoryProps {
  data: ValidatorRewardHistoryData;
  network?: 'testnet' | 'mainnet';
  className?: string;
}

export function ValidatorRewardHistory({
  data,
  network = 'testnet',
  className,
}: ValidatorRewardHistoryProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.validator);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerBaseUrl = network === 'mainnet'
    ? 'https://cspr.live'
    : 'https://testnet.cspr.live';

  if (data.rewards.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <Trophy className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground">No reward history found for this validator.</p>
      </Card>
    );
  }

  // Calculate average reward
  const avgReward = data.total_earnings_cspr / data.rewards.length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Summary */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Validator Rewards</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-mono truncate max-w-[200px]">
                {data.validator.slice(0, 12)}...{data.validator.slice(-12)}
              </span>
              <button
                onClick={handleCopy}
                className="p-0.5 hover:bg-muted rounded transition-colors"
              >
                {copied ? (
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
            <div className="text-2xl font-bold text-green-500">
              {data.total_earnings_cspr.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Total CSPR (Page)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {data.total_count}
            </div>
            <div className="text-xs text-muted-foreground">Eras</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {avgReward.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Avg CSPR/Era</div>
          </div>
        </div>
      </Card>

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{data.rewards.length} rewards on this page</span>
        <span>Page {data.current_page} of {data.page_count}</span>
      </div>

      {/* Rewards List */}
      <div className="space-y-2">
        {data.rewards.map((reward, index) => (
          <Card key={`${reward.era_id}-${index}`} padding="sm" className="hover:bg-accent/20 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Era {reward.era_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(reward.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {reward.reward_amount_cspr.toFixed(4)} CSPR
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

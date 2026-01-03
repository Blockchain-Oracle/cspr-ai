'use client';

import * as React from 'react';
import { Activity, Users, Layers, TrendingUp, Gavel } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

export interface AuctionMetricsData {
  current_era_id: number;
  total_active_era_stake_cspr: number;
  active_validator_number: number;
  total_bids_number: number;
  active_bids_number: number;
}

export interface AuctionMetricsCardProps {
  data: AuctionMetricsData;
  className?: string;
}

interface MetricItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  iconColor?: string;
}

function MetricItem({ icon: Icon, label, value, subValue, iconColor = 'text-primary' }: MetricItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className={cn("h-10 w-10 rounded-xl bg-background flex items-center justify-center border", iconColor.replace('text-', 'border-').replace('500', '500/30'))}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-bold text-lg">{value}</div>
        {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
      </div>
    </div>
  );
}

export function AuctionMetricsCard({
  data,
  className,
}: AuctionMetricsCardProps) {
  // Format large numbers
  const formatStake = (stake: number) => {
    if (stake >= 1e9) {
      return `${(stake / 1e9).toFixed(2)}B`;
    }
    if (stake >= 1e6) {
      return `${(stake / 1e6).toFixed(2)}M`;
    }
    if (stake >= 1e3) {
      return `${(stake / 1e3).toFixed(2)}K`;
    }
    return stake.toFixed(2);
  };

  const bidSuccessRate = data.total_bids_number > 0
    ? ((data.active_bids_number / data.total_bids_number) * 100).toFixed(1)
    : '0';

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Gavel className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Network Auction Metrics</h3>
            <div className="text-sm text-muted-foreground">
              Current Era: <span className="font-semibold text-foreground">{data.current_era_id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <MetricItem
          icon={TrendingUp}
          label="Total Stake"
          value={`${formatStake(data.total_active_era_stake_cspr)} CSPR`}
          iconColor="text-green-500"
        />

        <MetricItem
          icon={Users}
          label="Active Validators"
          value={data.active_validator_number}
          iconColor="text-blue-500"
        />

        <MetricItem
          icon={Layers}
          label="Total Bids"
          value={data.total_bids_number}
          subValue={`${data.active_bids_number} active`}
          iconColor="text-purple-500"
        />

        <MetricItem
          icon={Activity}
          label="Bid Success Rate"
          value={`${bidSuccessRate}%`}
          subValue={`${data.active_bids_number}/${data.total_bids_number}`}
          iconColor="text-yellow-500"
        />
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 text-center">
          Use <code className="bg-muted px-1 rounded">casper_get_current_validators</code> to see the full validator list
        </div>
      </div>
    </Card>
  );
}

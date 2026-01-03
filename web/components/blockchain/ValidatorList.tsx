'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';

export interface Validator {
  publicKey: string;
  name?: string;
  totalStake: string;
  delegationRate: number;
  performance?: number;
  isSelfDelegated?: boolean;
}

export interface ValidatorListProps {
  validators: Validator[];
  isLoading?: boolean;
  onDelegate?: (publicKey: string) => void;
  onSelect?: (publicKey: string) => void;
  theme?: 'light' | 'dark';
}

export function ValidatorList({
  validators,
  isLoading = false,
  onDelegate,
  onSelect,
  theme = 'dark',
}: ValidatorListProps) {
  if (isLoading) {
      return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading validators...</div>;
  }

  return (
    <div className="space-y-4">
       {validators.map((val) => (
           <Card key={val.publicKey} padding="sm" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
               <div>
                   <h4 className="font-bold text-sm font-mono">{val.name || `${val.publicKey.slice(0, 10)}...`}</h4>
                   <p className="text-xs text-muted-foreground">Rate: {val.delegationRate}% | Stake: {val.totalStake}</p>
               </div>
               <Button size="sm" variant="outline" onClick={() => onDelegate?.(val.publicKey)}>Delegate</Button>
           </Card>
       ))}
    </div>
  );
}
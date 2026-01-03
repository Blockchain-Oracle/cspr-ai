'use client';

import * as React from 'react';
import { Coins, User, Wallet, ArrowRightLeft, Copy, Check, ExternalLink } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

// Query result types based on query_type
export interface TokenMetadataResult {
  query_type: 'metadata';
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
}

export interface TokenBalanceResult {
  query_type: 'balance';
  contract_address: string;
  owner: string;
  balance: string;
}

export interface TokenSupplyResult {
  query_type: 'supply';
  contract_address: string;
  total_supply: string;
}

export interface TokenAllowanceResult {
  query_type: 'allowance';
  contract_address: string;
  owner: string;
  spender: string;
  allowance: string;
}

export type TokenQueryData =
  | TokenMetadataResult
  | TokenBalanceResult
  | TokenSupplyResult
  | TokenAllowanceResult;

export interface TokenQueryCardProps {
  data: TokenQueryData;
  network?: 'testnet' | 'mainnet';
  className?: string;
}

export function TokenQueryCard({
  data,
  network = 'testnet',
  className,
}: TokenQueryCardProps) {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const explorerBaseUrl = network === 'mainnet'
    ? 'https://cspr.live'
    : 'https://testnet.cspr.live';

  const queryType = data.query_type;

  // Determine icon and color based on query type
  const getQueryConfig = () => {
    switch (queryType) {
      case 'metadata':
        return {
          icon: Coins,
          color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
          title: 'Token Metadata'
        };
      case 'balance':
        return {
          icon: Wallet,
          color: 'text-green-500 bg-green-500/10 border-green-500/20',
          title: 'Token Balance'
        };
      case 'supply':
        return {
          icon: Coins,
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
          title: 'Token Supply'
        };
      case 'allowance':
        return {
          icon: ArrowRightLeft,
          color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
          title: 'Token Allowance'
        };
      default:
        return {
          icon: Coins,
          color: 'text-primary bg-primary/10 border-primary/20',
          title: 'Token Query'
        };
    }
  };

  const config = getQueryConfig();
  const Icon = config.icon;

  const AddressRow = ({ label, address }: { label: string; address: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {address.slice(0, 8)}...{address.slice(-8)}
        </span>
        <button
          onClick={() => handleCopy(address)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          {copiedHash === address ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <a
          href={`${explorerBaseUrl}/contract-package/${address}`}
          target="_blank"
          rel="noreferrer"
          className="p-1 hover:bg-muted rounded transition-colors hover:text-primary"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border", config.color)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{config.title}</h3>
            <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
              {queryType}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AddressRow label="Contract" address={data.contract_address} />

        {queryType === 'metadata' && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-semibold">{(data as TokenMetadataResult).name}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Symbol</div>
              <div className="font-semibold">{(data as TokenMetadataResult).symbol}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Decimals</div>
              <div className="font-semibold">{(data as TokenMetadataResult).decimals}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Total Supply</div>
              <div className="font-semibold">{(data as TokenMetadataResult).total_supply}</div>
            </div>
          </div>
        )}

        {queryType === 'balance' && (
          <>
            <AddressRow label="Owner" address={(data as TokenBalanceResult).owner} />
            <div className="mt-4 p-4 bg-green-500/10 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">Balance</div>
              <div className="text-2xl font-bold text-green-500">
                {(data as TokenBalanceResult).balance}
              </div>
            </div>
          </>
        )}

        {queryType === 'supply' && (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Total Supply</div>
            <div className="text-2xl font-bold text-blue-500">
              {(data as TokenSupplyResult).total_supply}
            </div>
          </div>
        )}

        {queryType === 'allowance' && (
          <>
            <AddressRow label="Owner" address={(data as TokenAllowanceResult).owner} />
            <AddressRow label="Spender" address={(data as TokenAllowanceResult).spender} />
            <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">Allowance</div>
              <div className="text-2xl font-bold text-yellow-500">
                {(data as TokenAllowanceResult).allowance}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

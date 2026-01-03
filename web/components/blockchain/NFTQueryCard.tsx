'use client';

import * as React from 'react';
import { Image, User, Wallet, Link2, FileText, Shield, Copy, Check, ExternalLink } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

// Query result types based on query_type
export interface NFTCollectionInfoResult {
  query_type: 'collection_info';
  contract_address: string;
  name: string;
  symbol: string;
  base_uri: string;
  max_supply: string;
  total_supply: string;
  minting_mode: string;
}

export interface NFTOwnerResult {
  query_type: 'owner';
  contract_address: string;
  token_id: string;
  owner: string;
}

export interface NFTBalanceResult {
  query_type: 'balance';
  contract_address: string;
  owner: string;
  balance: string;
}

export interface NFTTokenUriResult {
  query_type: 'token_uri';
  contract_address: string;
  token_id: string;
  token_uri: string;
}

export interface NFTMetadataResult {
  query_type: 'metadata';
  contract_address: string;
  token_id: string;
  name: string;
  token_uri: string;
  owner: string;
}

export interface NFTApprovedResult {
  query_type: 'approved';
  contract_address: string;
  token_id: string;
  approved: string | null;
}

export type NFTQueryData =
  | NFTCollectionInfoResult
  | NFTOwnerResult
  | NFTBalanceResult
  | NFTTokenUriResult
  | NFTMetadataResult
  | NFTApprovedResult;

export interface NFTQueryCardProps {
  data: NFTQueryData;
  network?: 'testnet' | 'mainnet';
  className?: string;
}

export function NFTQueryCard({
  data,
  network = 'testnet',
  className,
}: NFTQueryCardProps) {
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const explorerBaseUrl = network === 'mainnet'
    ? 'https://cspr.live'
    : 'https://testnet.cspr.live';

  const queryType = data.query_type || 'unknown';

  // Determine icon and color based on query type
  const getQueryConfig = () => {
    switch (queryType) {
      case 'collection_info':
        return {
          icon: Image,
          color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
          title: 'NFT Collection Info'
        };
      case 'owner':
        return {
          icon: User,
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
          title: 'NFT Owner'
        };
      case 'balance':
        return {
          icon: Wallet,
          color: 'text-green-500 bg-green-500/10 border-green-500/20',
          title: 'NFT Balance'
        };
      case 'token_uri':
        return {
          icon: Link2,
          color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
          title: 'NFT Token URI'
        };
      case 'metadata':
        return {
          icon: FileText,
          color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
          title: 'NFT Metadata'
        };
      case 'approved':
        return {
          icon: Shield,
          color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
          title: 'NFT Approval'
        };
      default:
        return {
          icon: Image,
          color: 'text-primary bg-primary/10 border-primary/20',
          title: 'NFT Query'
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

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium text-sm">{value}</span>
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
              {queryType?.replace('_', ' ') || 'NFT Query'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AddressRow label="Contract" address={data.contract_address} />

        {queryType === 'collection_info' && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-semibold">{(data as NFTCollectionInfoResult).name}</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Symbol</div>
                <div className="font-semibold">{(data as NFTCollectionInfoResult).symbol}</div>
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Base URI</div>
              <div className="font-mono text-sm break-all">{(data as NFTCollectionInfoResult).base_uri}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-xs text-muted-foreground">Max Supply</div>
                <div className="font-bold text-lg">{(data as NFTCollectionInfoResult).max_supply}</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-xs text-muted-foreground">Total Supply</div>
                <div className="font-bold text-lg">{(data as NFTCollectionInfoResult).total_supply}</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-xs text-muted-foreground">Minting</div>
                <div className="font-bold text-lg capitalize">{(data as NFTCollectionInfoResult).minting_mode}</div>
              </div>
            </div>
          </div>
        )}

        {queryType === 'owner' && (
          <>
            <InfoRow label="Token ID" value={(data as NFTOwnerResult).token_id} />
            <div className="mt-4 p-4 bg-blue-500/10 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Owner</div>
              <div className="font-mono text-sm break-all">{(data as NFTOwnerResult).owner}</div>
            </div>
          </>
        )}

        {queryType === 'balance' && (
          <>
            <AddressRow label="Owner" address={(data as NFTBalanceResult).owner} />
            <div className="mt-4 p-4 bg-green-500/10 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">NFTs Owned</div>
              <div className="text-2xl font-bold text-green-500">
                {(data as NFTBalanceResult).balance}
              </div>
            </div>
          </>
        )}

        {queryType === 'token_uri' && (
          <>
            <InfoRow label="Token ID" value={(data as NFTTokenUriResult).token_id} />
            <div className="mt-4 p-4 bg-cyan-500/10 rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">Token URI</div>
              <a
                href={(data as NFTTokenUriResult).token_uri}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-cyan-500 hover:underline break-all"
              >
                {(data as NFTTokenUriResult).token_uri}
              </a>
            </div>
          </>
        )}

        {queryType === 'metadata' && (
          <>
            <InfoRow label="Token ID" value={(data as NFTMetadataResult).token_id} />
            <InfoRow label="Name" value={(data as NFTMetadataResult).name} />
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Token URI</div>
                <a
                  href={(data as NFTMetadataResult).token_uri}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm text-primary hover:underline break-all"
                >
                  {(data as NFTMetadataResult).token_uri}
                </a>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Owner</div>
                <div className="font-mono text-sm break-all">{(data as NFTMetadataResult).owner}</div>
              </div>
            </div>
          </>
        )}

        {queryType === 'approved' && (
          <>
            <InfoRow label="Token ID" value={(data as NFTApprovedResult).token_id} />
            <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg text-center">
              <div className="text-xs text-muted-foreground mb-1">Approved Address</div>
              <div className="font-mono text-sm">
                {(data as NFTApprovedResult).approved || 'None'}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

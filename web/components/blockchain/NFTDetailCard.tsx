'use client';

import * as React from 'react';
import { ExternalLink, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';

export interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
}

export interface NFTDetailData {
  token_id: string;
  contract_package_hash: string;
  owner_hash: string;
  metadata?: NFTMetadata | null;
}

export interface NFTDetailCardProps {
  data: NFTDetailData;
  network?: 'testnet' | 'mainnet';
  onTransfer?: (data: NFTDetailData) => void;
  className?: string;
}

export function NFTDetailCard({
  data,
  network = 'testnet',
  onTransfer,
  className,
}: NFTDetailCardProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const explorerBaseUrl = network === 'mainnet'
    ? 'https://cspr.live'
    : 'https://testnet.cspr.live';

  const metadata = data.metadata;
  const imageUrl = metadata?.image;
  const nftName = metadata?.name || `Token #${data.token_id}`;
  const description = metadata?.description;

  // Get additional metadata fields (excluding standard ones)
  const additionalFields = metadata
    ? Object.entries(metadata).filter(
        ([key]) => !['name', 'description', 'image'].includes(key)
      )
    : [];

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* NFT Image */}
      <div className="aspect-square bg-muted relative">
        {imageUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={nftName}
            className="object-cover w-full h-full"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* NFT Details */}
      <div className="p-4 space-y-4">
        {/* Title & Description */}
        <div>
          <h3 className="text-lg font-bold">{nftName}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Token Info */}
        <div className="space-y-2 text-sm">
          {/* Token ID */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Token ID</span>
            <span className="font-mono font-medium">{data.token_id}</span>
          </div>

          {/* Owner */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Owner</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs truncate max-w-[120px]">
                {data.owner_hash.slice(0, 8)}...{data.owner_hash.slice(-8)}
              </span>
              <button
                onClick={() => handleCopy(data.owner_hash, 'owner')}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                {copiedField === 'owner' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              <a
                href={`${explorerBaseUrl}/account/${data.owner_hash}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Contract */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Contract</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs truncate max-w-[120px]">
                {data.contract_package_hash.slice(0, 8)}...{data.contract_package_hash.slice(-8)}
              </span>
              <button
                onClick={() => handleCopy(data.contract_package_hash, 'contract')}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                {copiedField === 'contract' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Metadata Fields */}
        {additionalFields.length > 0 && (
          <div className="border-t border-border pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Attributes
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {additionalFields.map(([key, value]) => (
                <div
                  key={key}
                  className="bg-muted/50 rounded-lg p-2 text-xs"
                >
                  <div className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="font-medium truncate">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {onTransfer && (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onTransfer(data)}
          >
            Transfer NFT
          </Button>
        )}
      </div>
    </Card>
  );
}

'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

export interface NFT {
  tokenId: string;
  name: string;
  imageUrl: string;
  collection?: string;
  contractAddress: string;
  metadataUri?: string;
  attributes?: Record<string, string>;
}

export interface NFTGalleryProps {
  nfts: NFT[];
  isLoading?: boolean;
  onNFTClick?: (nft: NFT) => void;
  onTransfer?: (nft: NFT) => void;
  emptyMessage?: string;
  theme?: 'light' | 'dark';
}

export function NFTGallery({
  nfts,
  isLoading = false,
  onNFTClick,
  onTransfer,
  emptyMessage = 'No NFTs found',
  theme = 'dark',
}: NFTGalleryProps) {
  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading NFTs...</div>;
  if (nfts.length === 0) return <div className="p-8 text-center text-muted-foreground">{emptyMessage}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {nfts.map((nft) => (
            <Card key={`${nft.contractAddress}-${nft.tokenId}`} padding="none" className="overflow-hidden group cursor-pointer" onClick={() => onNFTClick?.(nft)}>
                <div className="aspect-square bg-muted relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={nft.imageUrl} alt={nft.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="p-3">
                    <h4 className="font-bold text-sm truncate">{nft.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{nft.collection}</p>
                </div>
            </Card>
        ))}
    </div>
  );
}
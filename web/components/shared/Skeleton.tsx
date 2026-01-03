'use client';

import * as React from 'react';
import { cn } from '@/components/utils';
import { Card } from '@/components/shared/Card';

export interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rectangle' | 'card';
  width?: string | number;
  height?: string | number;
  animation?: 'shimmer' | 'pulse' | 'none';
  theme?: 'light' | 'dark';
  className?: string;
  lines?: number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
  theme,
  className,
  lines = 1,
}: SkeletonProps) {
    const baseClass = cn(
        "bg-muted/60 rounded-md",
        animation === 'pulse' && "animate-pulse",
        animation === 'shimmer' && "animate-pulse", // Using pulse for simplicity as shimmer needs custom keyframes
        className
    );

    const style = {
        width: width,
        height: height,
    };

    if (variant === 'circle') {
        return <div className={cn(baseClass, "rounded-full shrink-0")} style={style} />;
    }

    if (variant === 'text') {
        return (
            <div className={cn("space-y-2 w-full", className)}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div 
                        key={i} 
                        className={cn(baseClass, "h-4 rounded")} 
                        style={{ ...style, width: i === lines - 1 && lines > 1 ? '70%' : width || '100%' }} 
                    />
                ))}
            </div>
        );
    }

    return <div className={baseClass} style={style} />;
}

export function SkeletonCard({ showHeader = true, showAvatar = false, lines = 3 }: { showHeader?: boolean, showAvatar?: boolean, lines?: number }) {
    return (
        <Card className="space-y-4" padding="md">
            {showHeader && (
                <div className="flex items-center gap-4">
                    {showAvatar && <Skeleton variant="circle" width={40} height={40} />}
                    <div className="space-y-2 flex-1">
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" height={12} />
                    </div>
                </div>
            )}
            <Skeleton variant="text" lines={lines} />
        </Card>
    );
}

export function SkeletonMessage({ role = 'assistant' }: { role?: 'user' | 'assistant' }) {
    return (
        <div className={cn("flex w-full items-start gap-3 p-4 animate-pulse", role === 'user' ? "flex-row-reverse" : "flex-row")}>
             <Skeleton variant="circle" width={32} height={32} />
             <div className="space-y-2 max-w-[70%] w-full">
                 <div className={cn("rounded-2xl p-4 w-full", role === 'user' ? "bg-primary/5 rounded-tr-none" : "bg-muted rounded-tl-none")}>
                     <Skeleton variant="text" lines={2} className="bg-foreground/5" />
                 </div>
             </div>
        </div>
    );
}
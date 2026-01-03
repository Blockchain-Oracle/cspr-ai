'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Zap } from 'lucide-react';
import { cn } from '@/components/utils';

export interface UseCase {
  id: string;
  title: string;
  description: string;
  exampleQuery?: string;
  icon?: React.ReactNode;
  category?: string;
}

export interface UseCasesProps {
  useCases: UseCase[];
  title?: string;
  subtitle?: string;
  theme?: 'light' | 'dark';
  onUseCaseClick?: (useCase: UseCase) => void;
}

export function UseCases({
  useCases,
  title = 'What Can You Do?',
  subtitle,
  theme = 'dark',
  onUseCaseClick,
}: UseCasesProps) {
  return (
    <section className="py-24 container mx-auto px-4 md:px-6" id="use-cases">
       <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{title}</h2>
          {subtitle && <p className="text-lg text-muted-foreground">{subtitle}</p>}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((uc, index) => (
             <div 
               key={uc.id} 
               className="group relative rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500"
               style={{ animationDelay: `${index * 100}ms` }}
               onClick={() => onUseCaseClick?.(uc)}
             >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110 duration-300">
                    {uc.icon || <Zap className="h-6 w-6" />}
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{uc.title}</h3>
                <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                   {uc.description}
                </p>
                
                {uc.exampleQuery && (
                   <div className="mt-auto bg-muted/50 rounded-lg p-3 text-xs font-mono border border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 transition-colors relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-primary mr-2 select-none relative z-10">➜</span>
                      <span className="relative z-10">{uc.exampleQuery}</span>
                   </div>
                )}
             </div>
          ))}
       </div>
    </section>
  );
}
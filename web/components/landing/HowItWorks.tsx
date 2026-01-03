'use client';

import * as React from 'react';
import { cn } from '@/components/utils';
import { Zap } from 'lucide-react';

export interface Step {
  number: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export interface HowItWorksProps {
  steps: Step[];
  title?: string;
  subtitle?: string;
  theme?: 'light' | 'dark';
}

export function HowItWorks({
  steps,
  title = 'How It Works',
  subtitle,
  theme = 'dark',
}: HowItWorksProps) {
  return (
    <section className="py-24 bg-secondary/5 border-y border-border/40 overflow-hidden">
       <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-in fade-in zoom-in-95 duration-700">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{title}</h2>
              {subtitle && <p className="text-lg text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -z-10" />
              
              {steps.map((step, index) => (
                  <div 
                    key={step.number} 
                    className="relative flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                      <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl bg-card border border-border shadow-lg mb-6 group transition-all hover:scale-105 duration-300 hover:shadow-primary/20 hover:border-primary/50">
                          <div className="text-primary/80 group-hover:text-primary transition-colors transform scale-125">
                            {step.icon || <Zap className="h-8 w-8" />}
                          </div>
                          <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md border-4 border-background">
                              {step.number}
                          </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground max-w-xs leading-relaxed text-sm">
                          {step.description}
                      </p>
                  </div>
              ))}
          </div>
       </div>
    </section>
  );
}
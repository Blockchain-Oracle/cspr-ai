'use client';

import * as React from 'react';
import { Button } from '@/components/shared/Button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/components/utils';

export interface CTAProps {
  headline: string;
  description?: string;
  buttonText: string;
  onButtonClick: () => void;
  theme?: 'light' | 'dark';
}

export function CTA({
  headline,
  description,
  buttonText,
  onButtonClick,
  theme = 'dark',
}: CTAProps) {
  return (
    <section className="py-24 relative overflow-hidden">
       {/* Background gradient */}
       <div className="absolute inset-0 bg-gradient-to-t from-background via-background to-transparent pointer-events-none z-10" />
       
       <div className="container relative z-20 mx-auto px-4 md:px-6 text-center">
          <div className="max-w-4xl mx-auto rounded-[2rem] bg-gradient-to-br from-card to-background border border-border/50 p-8 md:p-20 shadow-2xl relative overflow-hidden group">
              {/* Animated Glow effects */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <div className="absolute -top-[200px] -right-[200px] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-colors duration-700" />
              <div className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] group-hover:bg-blue-500/20 transition-colors duration-700" />
              
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 relative z-10">
                 {headline}
              </h2>
              {description && (
                  <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto relative z-10">
                      {description}
                  </p>
              )}
              
              <div className="relative z-10">
                <Button 
                    size="lg" 
                    onClick={onButtonClick} 
                    className="h-14 px-10 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                    {buttonText}
                </Button>
              </div>
          </div>
       </div>
    </section>
  );
}
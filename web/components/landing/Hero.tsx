'use client';

import * as React from 'react';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';
import { ArrowRight, Sparkles, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import { BorderBeam } from '@/components/magicui/border-beam';

export interface HeroProps {
  headline: string;
  subheadline: string;
  primaryCTA: string;
  onPrimaryCTA: () => void;
  secondaryCTA?: string;
  onSecondaryCTA?: () => void;
  tertiaryCTA?: string;
  onTertiaryCTA?: () => void;
  theme?: 'light' | 'dark';
}

export function Hero({
  headline,
  subheadline,
  primaryCTA,
  onPrimaryCTA,
  secondaryCTA,
  onSecondaryCTA,
  tertiaryCTA,
  onTertiaryCTA,
  theme = 'dark',
}: HeroProps) {
  return (
    <div className="relative overflow-hidden py-20 lg:py-32">
       {/* CSS Grid Background */}
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 blur-[100px]"></div>
       </div>

       <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center text-center mx-auto">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
             className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-8"
          >
             <Sparkles className="mr-2 h-3.5 w-3.5" />
             AI-Powered Blockchain Assistant
          </motion.div>

          <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.1 }}
             className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6 max-w-5xl"
          >
            <span className="block text-foreground drop-shadow-sm">{headline}</span>
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 pb-2">
               using Natural Language
            </span>
          </motion.h1>

          <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="mx-auto max-w-[700px] text-lg text-muted-foreground mb-10 leading-relaxed"
          >
            {subheadline}
          </motion.p>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5, delay: 0.3 }}
             className="flex flex-col sm:flex-row items-center gap-4"
          >
             <Button
               size="lg"
               className="h-12 px-8 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow w-full sm:w-auto"
               onClick={onPrimaryCTA}
               rightIcon={<ArrowRight className="h-4 w-4" />}
             >
               {primaryCTA}
             </Button>

             {secondaryCTA && (
               <Button
                 variant="outline"
                 size="lg"
                 className="h-12 px-8 text-lg w-full sm:w-auto bg-background/50 backdrop-blur-sm"
                 onClick={onSecondaryCTA}
               >
                 {secondaryCTA}
               </Button>
             )}

             {tertiaryCTA && (
               <Button
                 variant="outline"
                 size="lg"
                 className="h-12 px-8 text-lg w-full sm:w-auto bg-background/50 backdrop-blur-sm"
                 onClick={onTertiaryCTA}
               >
                 {tertiaryCTA}
               </Button>
             )}
          </motion.div>
          
          {/* Terminal / Chat Preview */}
          <motion.div 
             initial={{ opacity: 0, y: 40, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             transition={{ duration: 0.8, delay: 0.4 }}
             className="mt-16 w-full max-w-4xl"
          >
             <div className="relative rounded-xl border bg-card/80 backdrop-blur shadow-2xl overflow-hidden">
                <BorderBeam size={250} duration={12} delay={9} />
                <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
                   <div className="h-3 w-3 rounded-full bg-red-500/80" />
                   <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                   <div className="h-3 w-3 rounded-full bg-green-500/80" />
                   <div className="ml-2 flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground font-mono opacity-70">
                      <Terminal className="h-3 w-3" />
                      <span>cspr-ai — chat</span>
                   </div>
                </div>
                <div className="p-4 sm:p-8 text-left font-mono text-sm space-y-4">
                   <div className="flex gap-3">
                      <span className="text-primary shrink-0">➜</span>
                      <span className="text-foreground">Check the balance of my main account</span>
                   </div>
                   <div className="flex gap-3 opacity-90">
                      <span className="text-blue-500 shrink-0">ai</span>
                      <div className="space-y-2 text-muted-foreground">
                         <p>I found the balance for account <span className="text-orange-400">01a2...f4e3</span>:</p>
                         <div className="rounded bg-muted/50 p-3 border border-border/50 text-foreground">
                            <span className="block">Balance: <span className="text-green-500">1,250,000 CSPR</span></span>
                            <span className="block text-xs opacity-70 mt-1">($37,500.00 USD)</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-3 animate-pulse">
                      <span className="text-primary shrink-0">➜</span>
                      <span className="w-2 h-4 bg-primary/50 block"></span>
                   </div>
                </div>
                
                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent pointer-events-none" />
             </div>
          </motion.div>
       </div>
    </div>
  );
}
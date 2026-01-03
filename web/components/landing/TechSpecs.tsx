'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';
import { Code2 } from 'lucide-react';

export interface TechItem {
  name: string;
  description: string;
  icon?: React.ReactNode;
  href?: string;
}

export interface TechSpecsProps {
  technologies: TechItem[];
  title?: string;
  subtitle?: string;
  theme?: 'light' | 'dark';
}

export function TechSpecs({
  technologies,
  title = 'Powered By',
  subtitle,
  theme = 'dark',
}: TechSpecsProps) {
  return (
    <section className="py-20 container mx-auto px-4 md:px-6">
       <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold tracking-tight uppercase text-muted-foreground/80 mb-4">{title}</h2>
          {subtitle && <p className="text-lg text-muted-foreground">{subtitle}</p>}
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map((tech) => (
             <div 
               key={tech.name} 
               className="flex items-start p-5 rounded-2xl border border-border/50 bg-card/30 hover:bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-sm group"
             >
                <div className="h-12 w-12 shrink-0 mr-4 rounded-xl bg-background border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors shadow-sm">
                    {tech.icon || <Code2 className="h-6 w-6" />}
                </div>
                <div>
                   <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">{tech.name}</h3>
                   <p className="text-sm text-muted-foreground leading-snug">{tech.description}</p>
                </div>
             </div>
          ))}
       </div>
    </section>
  );
}
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Github, Twitter, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { cn } from '@/components/utils';

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterProps {
  links?: {
    product?: FooterLink[];
    resources?: FooterLink[];
    company?: FooterLink[];
  };
  socialLinks?: {
    twitter?: string;
    github?: string;
    discord?: string;
  };
}

export function Footer({ links, socialLinks }: FooterProps) {
  const defaultLinks: { product: FooterLink[]; resources: FooterLink[]; company: FooterLink[] } = {
    product: [
      { label: 'Chat', href: '/chat' },
      { label: 'Features', href: '/#features' },
      { label: 'Use Cases', href: '/#use-cases' },
    ],
    resources: [
      { label: 'Documentation', href: 'https://docs.cspr-ai.xyz', external: true },
      { label: 'Casper Network', href: 'https://casper.network', external: true },
      { label: 'Community', href: 'https://discord.com/invite/casperblockchain', external: true },
    ],
    company: [
      { label: 'About', href: '/about' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  };

  const finalLinks = { ...defaultLinks, ...links };
  const finalSocials = {
    twitter: 'https://twitter.com/Casper_Network',
    github: 'https://github.com/casper-network',
    discord: 'https://discord.com/invite/casperblockchain',
    ...socialLinks
  };

  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container px-4 py-12 md:px-6 lg:py-16 mx-auto">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="md:col-span-2 lg:col-span-2">
            <Logo size="lg" className="mb-4" />
            <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
              The AI-powered assistant for the Casper ecosystem. Build, deploy, and interact with the blockchain using natural language.
            </p>
          </div>
          
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-muted-foreground">Product</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {finalLinks.product?.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    target={link.external ? "_blank" : undefined}
                    className="hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-muted-foreground">Resources</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {finalLinks.resources?.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    className="hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
             <h3 className="mb-4 text-sm font-semibold tracking-wide uppercase text-muted-foreground">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {finalLinks.company?.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    className="hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/40 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CSPR.AI. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            {finalSocials.twitter && (
              <Link href={finalSocials.twitter} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
            )}
            {finalSocials.github && (
               <Link href={finalSocials.github} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            )}
             {finalSocials.discord && (
               <Link href={finalSocials.discord} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                 <MessageCircle className="h-5 w-5" />
                 <span className="sr-only">Discord</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
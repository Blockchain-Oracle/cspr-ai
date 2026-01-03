'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/utils';
import { Footer } from '@/components/layout/Footer';

const docsNav = [
  { title: "Introduction", href: "/docs" },
  { title: "Getting Started", href: "/docs/getting-started" },
  { title: "How It Works", href: "/docs/how-it-works" },
  { title: "Architecture", href: "/docs/architecture" },
  { title: "Tools Reference", href: "/docs/tools" },
  { title: "FAQ", href: "/docs/faq" },
  { title: "Roadmap", href: "/docs/roadmap" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="container mx-auto flex flex-col md:flex-row gap-8 py-8 px-4 md:px-6 flex-1">
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24">
              <h2 className="font-bold mb-4 text-lg">Documentation</h2>
              <nav className="flex flex-col space-y-1">
                  {docsNav.map((item) => (
                      <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                              "px-4 py-2 rounded-md text-sm transition-colors block",
                              pathname === item.href
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                      >
                          {item.title}
                      </Link>
                  ))}
              </nav>
          </div>
        </aside>
        <div className="flex-1 min-w-0 prose prose-slate dark:prose-invert max-w-3xl">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}

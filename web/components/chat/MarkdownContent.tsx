'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/components/utils';

export interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * MarkdownContent - Renders markdown text with GitHub Flavored Markdown support
 *
 * Handles:
 * - Headings (h1-h3)
 * - Bold, italic, strikethrough
 * - Lists (ordered and unordered)
 * - Code blocks (inline and block)
 * - Links
 * - Blockquotes
 * - Tables
 * - Task lists
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content) return null;

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none overflow-hidden', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs
          p: ({ children }) => (
            <p
              className="mb-2 last:mb-0 break-words"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,

          // Code blocks
          code: ({ node, className: codeClassName, children, ...props }: any) => {
            // Check if it's a code block (has language-* class) or inline code
            const isBlock = codeClassName?.startsWith('language-');

            if (isBlock) {
              return (
                <code
                  className="block bg-background/30 p-3 rounded-lg font-mono text-xs overflow-x-auto my-2 border border-border/50 break-words"
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code
                className="bg-background/20 px-1.5 py-0.5 rounded font-mono text-xs break-words"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              className="my-2 overflow-x-auto break-words"
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {children}
            </pre>
          ),

          // Headings
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold mb-1">{children}</h4>,

          // Text formatting
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through opacity-70">{children}</del>,

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 italic my-2 text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
              <table className="min-w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border/30 last:border-0">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2">{children}</td>
          ),

          // Horizontal rule
          hr: () => <hr className="my-4 border-border/50" />,

          // Images (if needed)
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full h-auto rounded-lg my-2"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

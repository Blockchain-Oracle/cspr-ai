'use client';

import * as React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask about Casper blockchain...',
  disabled = false,
  isLoading = false,
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className={cn(
        "relative flex items-end gap-2 rounded-xl border-2 border-border/60 bg-background p-1.5 shadow-sm transition-all focus-within:border-primary/60 focus-within:shadow-md",
        disabled && "opacity-50 pointer-events-none"
    )}>
       <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-h-[44px] max-h-[200px] bg-transparent resize-none border-0 py-3 px-3 placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-sm scrollbar-hide"
          disabled={disabled || isLoading}
          rows={1}
       />

       <Button
         onClick={onSubmit}
         disabled={!value.trim() || disabled || isLoading}
         variant="primary"
         size="icon"
         className={cn(
             "h-10 w-10 shrink-0 transition-all rounded-lg",
             !value.trim() && !isLoading ? "opacity-0 scale-90" : "opacity-100 scale-100",
             isLoading && "opacity-100"
         )}
       >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="sr-only">Send message</span>
       </Button>
    </div>
  );
}
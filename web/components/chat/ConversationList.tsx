'use client';

import * as React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/components/utils';

export interface ConversationItem {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
}

export interface ConversationListProps {
  conversations: ConversationItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (conversations.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground/60 h-full">
              <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No conversations</p>
          </div>
      );
  }

  return (
    <div className="space-y-1 p-2">
       {conversations.map((conv) => (
           <div 
             key={conv.id}
             className={cn(
               "group relative flex w-full flex-col gap-1 rounded-lg p-3 text-sm transition-all hover:bg-accent/50 cursor-pointer border border-transparent",
               activeId === conv.id 
                 ? "bg-accent text-accent-foreground border-border/50 shadow-sm" 
                 : "text-muted-foreground hover:text-foreground"
             )}
             onClick={() => onSelect(conv.id)}
           >
               <div className="flex items-center justify-between">
                   <span className="font-medium truncate pr-6">{conv.title || "New Chat"}</span>
                   <span className="text-[10px] opacity-60 shrink-0">
                       {new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </span>
               </div>
               <p className="text-xs opacity-70 truncate pr-6 line-clamp-1">
                   {conv.preview}
               </p>

               {onDelete && (
                  <button 
                     className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                     onClick={(e) => {
                         e.stopPropagation();
                         onDelete(conv.id);
                     }}
                     title="Delete conversation"
                  >
                      <Trash2 className="h-3.5 w-3.5" />
                  </button>
               )}
           </div>
       ))}
    </div>
  );
}
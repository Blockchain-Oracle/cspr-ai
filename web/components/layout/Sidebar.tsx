'use client';

import * as React from 'react';
import { Plus, MessageSquare, Trash2, Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SidebarProps {
  conversations?: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
  onDeleteConversation?: (id: string) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isCollapsed = false,
  onToggle,
}: SidebarProps) {
  return (
    <div 
      className={cn(
        "flex flex-col border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out h-full",
        isCollapsed ? "w-[70px]" : "w-[280px]"
      )}
    >
      <div className="p-4 border-b border-border/50">
        {!isCollapsed ? (
          <Button variant="primary" fullWidth onClick={onNewChat} leftIcon={<Plus className="h-4 w-4" />}>
            New Chat
          </Button>
        ) : (
          <Button variant="primary" size="icon" onClick={onNewChat} title="New Chat" className="w-full">
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
        {!isCollapsed && conversations.length > 0 && (
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">
            History
          </div>
        )}
        
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className={cn(
              "group relative flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors hover:bg-accent/50",
              activeConversationId === conv.id 
                ? "bg-accent text-accent-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onSelectConversation?.(conv.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
            
            {!isCollapsed && (
              <>
                <span className="flex-1 truncate text-left">
                  {conv.title || "New Conversation"}
                </span>
                {onDeleteConversation && activeConversationId === conv.id && (
                  <div
                    role="button"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </div>
                )}
              </>
            )}
          </button>
        ))}
        
        {conversations.length === 0 && !isCollapsed && (
           <div className="flex flex-col items-center justify-center h-40 text-center px-4">
             <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-2" />
             <p className="text-sm text-muted-foreground">No conversations yet</p>
             <p className="text-xs text-muted-foreground/60 mt-1">Start a new chat to explore Casper blockchain</p>
           </div>
        )}
      </div>

      <div className="p-3 border-t border-border/50 mt-auto space-y-1">
         {!isCollapsed ? (
             <>
                <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground/50 px-2">v0.1.0</span>
                    <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-muted-foreground">
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                </div>
             </>
         ) : (
             <div className="flex flex-col items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={onToggle}>
                    <ChevronRight className="h-4 w-4" />
                 </Button>
             </div>
         )}
      </div>
    </div>
  );
}
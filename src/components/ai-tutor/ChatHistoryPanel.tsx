import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus,
  MessageSquare,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AISession } from '@/services/unified-ai-service';
import { SessionPreview } from './SessionPreview';

interface ChatHistoryPanelProps {
  sessions: AISession[];
  activeSession?: AISession | null;
  onSessionSelect: (session: AISession) => void;
  onSessionDelete?: (sessionId: string) => void;
  onNewSession: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  sessions,
  activeSession,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
  isCollapsed = false,
  onToggleCollapse,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    const hasMatchingMessage = session.messages.some(msg => 
      msg.content.toLowerCase().includes(searchLower)
    );
    const hasMatchingSubject = session.subject.toLowerCase().includes(searchLower);
    return hasMatchingMessage || hasMatchingSubject;
  });

  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const now = new Date();
    const sessionDate = new Date(session.lastActive);
    const diffInDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let group: string;
    if (diffInDays === 0) {
      group = 'Today';
    } else if (diffInDays === 1) {
      group = 'Yesterday';
    } else if (diffInDays <= 7) {
      group = 'This Week';
    } else if (diffInDays <= 30) {
      group = 'This Month';
    } else {
      group = 'Older';
    }

    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {} as Record<string, AISession[]>);

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

  if (isCollapsed) {
    return (
      <div className={cn(
        'flex flex-col items-center p-2 border-r bg-muted/20',
        className
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewSession}
          className="h-8 w-8 p-0 mb-2"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <div className="flex flex-col gap-1">
          {sessions.slice(0, 5).map(session => (
            <Button
              key={session.id}
              variant="ghost"
              size="sm"
              onClick={() => onSessionSelect(session)}
              className={cn(
                'h-8 w-8 p-0 relative',
                activeSession?.id === session.id && 'bg-primary/10 text-primary'
              )}
              title={session.subject}
            >
              <MessageSquare className="h-3 w-3" />
              {session.messages.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  {session.messages.length}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = sessions.length === 0 && !searchTerm;
  
  return (
    <div className={cn(
      'flex flex-col h-full w-64 border-r bg-muted/20 flex-shrink-0 transition-all duration-300',
      isEmpty && 'sidebar-empty',
      className
    )}
    style={{
      position: 'sticky',
      top: 0,
      height: '100%',
      overflowY: 'hidden'
    }}>
      {/* Header - Outside sidebar-content for proper display */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <History className="h-4 w-4 flex-shrink-0" />
          <h2 className={cn(
            "font-semibold text-sm whitespace-nowrap transition-opacity duration-300",
            isEmpty && "sidebar-empty-text"
          )}>
            Chat History
          </h2>
        </div>
      </div>
      
      <div className="sidebar-content flex-1 overflow-hidden">

        {/* New Chat Button */}
        <div className="p-4 pb-2">
          <Button
            onClick={onNewSession}
            className={cn(
              "w-full justify-start gap-2",
              isEmpty && "sidebar-empty-button"
            )}
            size="sm"
            title="New Chat"
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            <span className={cn(
              "whitespace-nowrap",
              isEmpty && "sidebar-empty-text"
            )}>New Chat</span>
          </Button>
        </div>

        {/* Search */}
        <div className={cn(
          "px-4 pb-4",
          isEmpty && "sidebar-empty-search"
        )}>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={isEmpty ? "" : "Search conversations..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-sm"
              title="Search conversations"
            />
          </div>
        </div>

        {/* Sessions List */}
        <ScrollArea className="flex-1">
          <div className="px-2">
          {filteredSessions.length === 0 ? (
            <div className={cn(
              "p-4 text-center text-sm text-muted-foreground",
              isEmpty && "sidebar-empty-text"
            )}>
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            <div className="space-y-4">
              {groupOrder.map(groupName => {
                const groupSessions = groupedSessions[groupName];
                if (!groupSessions?.length) return null;

                return (
                  <div key={groupName} className="space-y-2">
                    <div className="px-2 py-1">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {groupName}
                      </h3>
                      <Separator className="mt-1" />
                    </div>
                    
                    <div className="space-y-1">
                      {groupSessions.map(session => (
                        <SessionPreview
                          key={session.id}
                          session={session}
                          isActive={activeSession?.id === session.id}
                          onSelect={onSessionSelect}
                          onDelete={onSessionDelete}
                          className="mx-1"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="p-4 border-t">
          <div className={cn(
            "text-xs text-muted-foreground text-center whitespace-nowrap",
            isEmpty && "sidebar-empty-text"
          )}>
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
            {searchTerm && filteredSessions.length !== sessions.length && (
              <span> • {filteredSessions.length} shown</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
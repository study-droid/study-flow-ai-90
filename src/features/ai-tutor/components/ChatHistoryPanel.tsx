/**
 * Chat History Panel component for AI Tutor
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X, 
  MessageSquare, 
  Trash2, 
  Calendar,
  Clock,
  Plus,
  Edit,
  Check,
  X as XIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ChatSession } from '../types';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionRename?: (sessionId: string, title: string) => void;
  onNewSession?: () => void;
  onClose: () => void;
  className?: string;
}

export function ChatHistoryPanel({
  isOpen,
  sessions,
  currentSession,
  onSessionSelect,
  onSessionDelete,
  onSessionRename,
  onNewSession,
  onClose,
  className
}: ChatHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>('');

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(message => 
      message.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Group sessions by date
  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = new Date(session.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  const handleSessionDelete = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onSessionDelete?.(sessionId);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onClose}
          aria-hidden="true" 
        />
      )}
      
      <div 
        className={cn(
          "chat-history-panel",
          className
        )}
        data-open={isOpen}
      >
        {/* Header */}
        <div className="history-header">
          <div className="header-title">
            <MessageSquare className="w-4 h-4" />
            <span>Chat History</span>
            <Badge variant="secondary" className="session-count">
              {sessions.length}
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="close-btn"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

      {/* Search */}
      <div className="history-search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* New Session Button */}
      {onNewSession && (
        <div className="history-actions">
          <Button
            variant="outline"
            className="new-session-btn"
            onClick={onNewSession}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      )}

      {/* Sessions List */}
      <ScrollArea className="history-content">
        {Object.keys(groupedSessions).length === 0 ? (
          <div className="empty-state">
            <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No matching conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="sessions-list">
            {Object.entries(groupedSessions).map(([date, daySessions]) => (
              <div key={date} className="session-group">
                <div className="group-header">
                  <Calendar className="w-3 h-3" />
                  <span>{date === new Date().toDateString() ? 'Today' : date}</span>
                </div>
                
                <div className="group-sessions">
                  {daySessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "session-item",
                        currentSession?.id === session.id && "active"
                      )}
                      onClick={() => onSessionSelect(session.id)}
                      onMouseEnter={() => setHoveredSessionId(session.id)}
                      onMouseLeave={() => setHoveredSessionId(null)}
                    >
                      <div className="session-content">
                        <div className="session-title">
                          {renamingId === session.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                className="h-7"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button size="sm" variant="secondary" className="h-7"
                                onClick={(e) => { e.stopPropagation(); onSessionRename?.(session.id, tempTitle.trim()); setRenamingId(null); }}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7"
                                onClick={(e) => { e.stopPropagation(); setRenamingId(null); }}>
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{session.title}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); setRenamingId(session.id); setTempTitle(session.title); }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="session-meta">
                          <div className="session-info">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatDistanceToNow(new Date(session.updatedAt), { 
                                addSuffix: true 
                              })}
                            </span>
                          </div>
                          
                          <Badge variant="outline" className="message-count">
                            {session.messages.length}
                          </Badge>
                        </div>

                        {session.metadata?.subject && (
                          <Badge 
                            variant="secondary" 
                            className="subject-badge"
                          >
                            {session.metadata.subject}
                          </Badge>
                        )}
                      </div>

                      {/* Delete Button */}
                      {hoveredSessionId === session.id && onSessionDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="delete-btn"
                          onClick={(e) => handleSessionDelete(session.id, e)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      </div>
    </>
  );
}

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Clock, 
  Trash2, 
  BookOpen,
  Star,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { AISession } from '@/services/unified-ai-service';

interface SessionPreviewProps {
  session: AISession;
  isActive?: boolean;
  onSelect: (session: AISession) => void;
  onDelete?: (sessionId: string) => void;
  className?: string;
}

export const SessionPreview: React.FC<SessionPreviewProps> = ({
  session,
  isActive = false,
  onSelect,
  onDelete,
  className
}) => {
  const lastMessage = session.messages[session.messages.length - 1];
  const messageCount = session.messages.length;
  const lastUserMessage = session.messages
    .filter(m => m.role === 'user')
    .pop();

  const getPreviewText = (): string => {
    if (lastUserMessage) {
      return lastUserMessage.content.length > 60 
        ? lastUserMessage.content.substring(0, 60) + '...'
        : lastUserMessage.content;
    }
    return 'New conversation';
  };

  const getProviderColor = (provider: string): string => {
    switch (provider) {
      case 'deepseek': return 'bg-blue-500';
      case 'openai': return 'bg-green-500';
      case 'claude': return 'bg-purple-500';
      case 'gemini': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md session-preview',
        isActive && 'ring-2 ring-primary border-primary bg-primary/5',
        className
      )}
      onClick={() => onSelect(session)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header with subject and provider */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              getProviderColor(session.provider)
            )} />
            <Badge variant="outline" className="text-xs font-normal">
              {session.subject}
            </Badge>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Preview text */}
        <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
          {getPreviewText()}
        </p>

        {/* Footer with metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {messageCount}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(session.lastActive, { addSuffix: true })}
            </span>
          </div>
          
          {/* Provider badge */}
          <div className="flex items-center gap-1">
            {session.provider === 'deepseek' && <Zap className="h-3 w-3" />}
            {session.provider === 'openai' && <Star className="h-3 w-3" />}
            {session.provider === 'claude' && <BookOpen className="h-3 w-3" />}
            <span className="capitalize text-xs">
              {session.provider}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
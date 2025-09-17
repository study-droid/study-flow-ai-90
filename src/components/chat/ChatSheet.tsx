/**
 * Chat Sheet Component - Simplified version
 */

interface ChatSheetProps {
  className?: string;
}

export function ChatSheet({ className }: ChatSheetProps) {
  return (
    <div className={className}>
      <p>Chat Sheet - Simplified</p>
    </div>
  );
}
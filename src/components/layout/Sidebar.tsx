import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home,
  Calendar,
  BookOpen,
  BarChart3,
  Brain,
  Clock,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  isMobileSheet?: boolean;
}

export const Sidebar = ({ className, onNavigate, }: SidebarProps) => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: Calendar,
    },
    {
      name: 'Study',
      href: '/study',
      icon: BookOpen,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      name: 'AI Tutor',
      href: '/tutor',
      icon: Brain,
    },
    {
      name: 'Pomodoro',
      href: '/pomodoro',
      icon: Clock,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className={cn(
      "flex flex-col h-full w-[280px] border-r bg-background",
      className
    )}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-primary-glow to-warning flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm filter drop-shadow-sm">🧸</span>
          </div>
          <span className="font-heading font-semibold text-lg bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Study Teddy
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
};
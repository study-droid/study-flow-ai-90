import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Calendar,
  BookOpen,
  Target,
  BarChart3,
  Users,
  Brain,
  Clock,
  Trophy,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  isMobileSheet?: boolean; // Added to know if sidebar is in mobile sheet
}

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
  color?: string;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", icon: Home, href: "/" },
  { title: "Calendar", icon: Calendar, href: "/calendar", badge: "New" },
  { title: "Tasks & Assignments", icon: Clock, href: "/tasks" },
  { title: "Study", icon: BookOpen, href: "/study" },
  { title: "Subjects", icon: BookMarked, href: "/subjects" },
  { title: "Flashcards", icon: Brain, href: "/flashcards" },
  { title: "Achievements", icon: Trophy, href: "/achievements" },
  { title: "Analytics", icon: BarChart3, href: "/analytics" },
];

const aiFeatures: NavItem[] = [
  { title: "Focus Timer", icon: Clock, href: "/study", color: "progress" },
  { title: "AI Insights", icon: Brain, href: "/ai-recommendations", color: "primary" },
  { title: "AI Tutor", icon: GraduationCap, href: "/ai-tutor", color: "primary" },
];

const bottomNavItems: NavItem[] = [
  { title: "Settings", icon: Settings, href: "/settings" },
];

export const Sidebar = ({ className, onNavigate, isMobileSheet = false }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Never collapse if in mobile sheet, otherwise check screen size
    if (isMobileSheet) return false;
    
    // Only collapse on desktop sidebar for small screens
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024; // Changed from 768 to 1024 for better breakpoint
    }
    return false;
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Handle window resize to auto-collapse on mobile (only for desktop sidebar)
  useEffect(() => {
    // Skip resize handling if in mobile sheet
    if (isMobileSheet) return;
    
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Check initial size
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileSheet]);

  // Always show full nav in mobile sheet, respect collapse state otherwise
  const showFullNav = isMobileSheet || !isCollapsed;
  
  const NavButton = ({ item }: { item: NavItem }) => {
    
    return (
      <Button
        variant={location.pathname === item.href ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start study-flow-transition min-h-[44px] touch-manipulation",
          !showFullNav && "px-2 justify-center",
          location.pathname === item.href && "bg-primary/10 text-primary border-l-4 border-primary",
          isMobileSheet && "hover:bg-accent/50" // Better mobile hover state
        )}
        onClick={() => {
          navigate(item.href);
          onNavigate?.();
        }}
        title={!showFullNav ? item.title : undefined}
      >
        <item.icon className={cn(
          "h-5 w-5 flex-shrink-0",
          item.color && `text-${item.color}`,
          showFullNav && "mr-3" // Add margin when showing text
        )} />
        {showFullNav && (
          <>
            <span className="truncate text-sm sm:text-base font-medium" title={item.title}>
              {item.title}
            </span>
            {item.badge && (
              <Badge
                variant="secondary"
                className="ml-auto bg-primary/20 text-primary text-xs flex-shrink-0"
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "border-r bg-card/30 backdrop-blur-sm study-flow-transition-smooth flex flex-col h-full",
        isCollapsed ? "w-16" : "w-full lg:w-64",
        className
      )}
    >
      {/* Collapse Toggle - Only show on desktop sidebar, not in mobile sheet */}
      {!isMobileSheet && (
        <div className="hidden lg:flex h-16 items-center justify-between px-4 border-b">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-primary truncate">Navigation</h2>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto h-9 w-9 flex-shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      
      {/* Mobile Header - Only show in mobile sheet */}
      {isMobileSheet && (
        <div className="flex h-14 items-center px-4 border-b bg-background/95 backdrop-blur">
          <h2 className="text-lg font-semibold text-primary">Navigation</h2>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            {showFullNav && (
              <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                Main
              </h3>
            )}
            {mainNavItems.map((item) => (
              <NavButton key={item.href} item={item} />
            ))}
          </div>

          <Separator className="my-3 sm:my-4" />

          {/* AI Features */}
          <div className="space-y-1">
            {showFullNav && (
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                  Study Tools
                </h3>
              </div>
            )}
            {aiFeatures.map((item) => (
              <NavButton key={item.href} item={item} />
            ))}
          </div>

          <Separator className="my-3 sm:my-4" />

          {/* Settings */}
          <div className="space-y-1">
            {bottomNavItems.map((item) => (
              <NavButton key={item.href} item={item} />
            ))}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
};
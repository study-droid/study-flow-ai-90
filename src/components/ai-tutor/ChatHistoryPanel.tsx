import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Calendar, 
  BookOpen, 
  Clock, 
  Target, 
  Brain,
  Settings,
  User,
  TrendingUp,
  Bell,
  Menu,
  X
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null },
    { id: 'calendar', label: 'Calendar', icon: Calendar, badge: null },
    { id: 'tasks', label: 'Tasks', icon: BookOpen, badge: '3' },
    { id: 'timer', label: 'Study Timer', icon: Clock, badge: null },
    { id: 'goals', label: 'Goals', icon: Target, badge: null },
    { id: 'ai-tutor', label: 'AI Tutor', icon: Brain, badge: 'NEW' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, badge: null },
  ];

  const bottomItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <Button 
        variant="ghost" 
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-card border-r border-border z-50 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:relative md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">StudyFlow</h2>
                    <p className="text-xs text-muted-foreground">AI Study Planner</p>
                  </div>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="hidden md:flex h-8 w-8 p-0"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-4">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`
                      w-full justify-start gap-3 h-10
                      ${isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'hover:bg-muted'}
                      ${isCollapsed ? 'px-2' : 'px-3'}
                    `}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileOpen(false);
                    }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant={item.badge === 'NEW' ? 'default' : 'secondary'} 
                            className="text-xs h-5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* User Section */}
          <div className="p-3 border-t border-border">
            {!isCollapsed && (
              <div className="mb-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-success rounded-full flex items-center justify-center">
                    <span className="text-success-foreground font-medium">A</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Alex Chen</p>
                    <p className="text-xs text-muted-foreground">7-day streak! 🔥</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              {bottomItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`
                      w-full justify-start gap-3 h-9 text-muted-foreground hover:text-foreground
                      ${isCollapsed ? 'px-2' : 'px-3'}
                    `}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileOpen(false);
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
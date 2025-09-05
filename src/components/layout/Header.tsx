import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import {
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  BookOpen,
  Zap,
  Download,
  Timer,
  Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSettings } from "@/hooks/useSettings";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import defaultAvatarImage from "@/assets/avatar_profile.png";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps = {}) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { settings, updateSettings, exportData } = useSettings();
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first for immediate theme application
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return settings?.theme === 'dark';
  });

  // Apply theme on component mount and when theme changes
  useEffect(() => {
    const applyTheme = (theme: string) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Apply theme from localStorage immediately
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      applyTheme(savedTheme);
      setIsDark(savedTheme === 'dark');
    } else if (settings?.theme) {
      // Apply theme from settings if no localStorage
      applyTheme(settings.theme);
      setIsDark(settings.theme === 'dark');
      localStorage.setItem('theme', settings.theme);
    }
  }, [settings]);

  // Sync settings with localStorage when settings change
  useEffect(() => {
    if (settings?.theme) {
      localStorage.setItem('theme', settings.theme);
      setIsDark(settings.theme === 'dark');
    }
  }, [settings?.theme]);

  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    
    // Apply theme immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage immediately for instant persistence
    localStorage.setItem('theme', newTheme);
    
    // Update settings in database
    if (settings) {
      await updateSettings({ theme: newTheme });
    }
  };

  const getInitials = () => {
    const name = profile?.display_name || user?.email || 'User';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-md study-flow-shadow-soft sticky top-0 z-50">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
        {/* Mobile Menu & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuClick}
            className="lg:hidden h-9 w-9 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center">
              <img 
                src="/main_logo.png" 
                alt="StudyFlow Logo" 
                className="h-6 w-6 sm:h-8 sm:w-8 object-contain" 
              />
            </div>
            <h1 className="text-sm sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent whitespace-nowrap">
              <span className="hidden sm:inline">StudyFlow</span>
              <span className="sm:hidden">SF</span>
            </h1>
          </div>
          
          
          {/* Focus Mode Button - Desktop Only */}
          <Button
            onClick={() => navigate('/study')}
            className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-focus/20 to-primary/20 border border-focus/30 hover:bg-orange-hover/20 hover:border-orange-hover/50 hover:scale-105 transition-all duration-300 group ml-24"
            variant="ghost"
            size="sm"
          >
            <Timer className="h-4 w-4 text-focus group-hover:text-orange-hover transition-colors duration-300 group-hover:rotate-12" />
            <span className="text-sm font-medium bg-gradient-to-r from-focus to-primary bg-clip-text text-transparent group-hover:text-orange-hover group-hover:font-bold group-hover:bg-none whitespace-nowrap transition-all duration-300">Focus Mode</span>
            <div className="h-2 w-2 bg-focus group-hover:bg-orange-hover rounded-full animate-pulse group-hover:animate-bounce transition-colors" />
          </Button>
        </div>

        {/* Search Bar - Hidden on mobile, shown on tablet+ */}
        <div className="hidden sm:flex flex-1 max-w-md mx-2 lg:mx-4 min-w-0">
          <GlobalSearch 
            placeholder="Search..."
            className="w-full"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg"
          >
            {isDark ? (
              <Sun className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <Moon className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </Button>

          {/* Notifications */}
          <NotificationDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || defaultAvatarImage} alt="User Avatar" />
                  <AvatarFallback className="study-flow-gradient text-white text-xs">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate" title={profile?.display_name || user?.email}>
                    {profile?.display_name || user?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate" title={user?.email}>
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('json')}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export Data</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
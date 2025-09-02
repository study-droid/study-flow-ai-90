import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex min-h-0 flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block flex-shrink-0">
          <Sidebar />
        </div>
        
        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-[350px]">
            <Sidebar 
              className="border-0 h-full" 
              onNavigate={() => setSidebarOpen(false)} 
              isMobileSheet={true} 
            />
          </SheetContent>
        </Sheet>
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 custom-scrollbar overflow-auto max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] min-w-0">
          <div className="w-full max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
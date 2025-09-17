import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FloatingAIButton } from "@/components/ai/FloatingAIButton";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 min-h-0">
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
        
        <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Floating AI Assistant */}
      <FloatingAIButton />
    </div>
  );
};
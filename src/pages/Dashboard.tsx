import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModernDashboard } from "@/components/enhanced/ModernDashboard";
import { TeddyLogo } from "@/components/brand/TeddyLogo";
import { EnhancedButton } from "@/components/enhanced/EnhancedButton";
import { 
  LogOut,
} from "lucide-react";

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center space-y-4">
            <TeddyLogo size="xl" animated className="justify-center" />
            <CardTitle className="font-heading">Welcome to Study Teddy!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Please sign in to access your personalized dashboard</p>
            <EnhancedButton 
              onClick={() => navigate('/')} 
              variant="teddy" 
              className="w-full"
            >
              Go to Home
            </EnhancedButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Quick Sign Out Button */}
        <div className="absolute top-0 right-0 z-10">
          <EnhancedButton 
            variant="ghost" 
            size="sm" 
            onClick={signOut} 
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </EnhancedButton>
        </div>
        
        {/* Modern Dashboard */}
        <ModernDashboard />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
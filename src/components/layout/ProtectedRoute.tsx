import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Brain } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Check if user needs onboarding
    if (!authLoading && !profileLoading && user && profile) {
      // Three states for setup_completed:
      // null/undefined = new user, hasn't seen onboarding yet -> redirect to onboarding
      // false = user saw onboarding but skipped -> allow dashboard access
      // true = user completed onboarding -> allow dashboard access

      const hasSeenOnboarding = profile.setup_completed !== null && profile.setup_completed !== undefined;

      // Redirect new users to onboarding (except if already there)
      if (location.pathname !== '/onboarding' && !hasSeenOnboarding) {
        navigate('/onboarding');
      }
    }
  }, [user, profile, authLoading, profileLoading, navigate, location.pathname]);

  const loading = authLoading || profileLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-focus flex items-center justify-center animate-pulse">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">Loading Study-Flow</h3>
              <p className="text-sm text-muted-foreground">Preparing your study environment...</p>
            </div>
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-focus rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
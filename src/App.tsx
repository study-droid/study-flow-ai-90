import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SecurityProvider } from "@/hooks/useSecurity";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { GlobalErrorBoundary } from "@/components/error-boundaries/GlobalErrorBoundary";
import { Suspense, lazy, useEffect } from "react";
import { FloatingTimer } from "@/components/timer/FloatingTimer";
// import { EmbeddedAmbientPlayer } from "@/components/audio/EmbeddedAmbientPlayer";
import { PageLoader } from "@/components/ui/page-loader";
import { setupGlobalAsyncErrorHandling } from "@/utils/async-error-handler";
import "@/services/api/api-error-interceptor"; // Initialize API error interceptor
import { errorMonitoring, addBreadcrumb } from "@/services/error-monitoring";

const Index = lazy(() => import("./pages/Index"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Study = lazy(() => import("./pages/Study"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const Goals = lazy(() => import("./pages/Goals"));
const Settings = lazy(() => import("./pages/Settings"));
const Subjects = lazy(() => import("./pages/Subjects").then(m => ({ default: m.Subjects })));
const Timetable = lazy(() => import("./pages/Timetable").then(m => ({ default: m.Timetable })));
const Security = lazy(() => import("./pages/Security").then(m => ({ default: m.Security })));
const Performance = lazy(() => import("./pages/Performance").then(m => ({ default: m.Performance })));
const Achievements = lazy(() => import("./pages/Achievements").then(m => ({ default: m.Achievements })));
const AIRecommendations = lazy(() => import("./pages/AIRecommendations").then(m => ({ default: m.AIRecommendations })));
const AITutor = lazy(() => import("./pages/AITutor"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const Tables = lazy(() => import("./pages/Tables"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on certain error types
        if (error instanceof Error && (
          error.message.includes('401') ||
          error.message.includes('403') ||
          error.message.includes('404')
        )) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Helper function to handle global errors (moved outside component)
const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Report to error monitoring service
  errorMonitoring.reportError(error, 'react-component', {
    context: { feature: 'app-root' },
    metadata: { componentStack: errorInfo.componentStack }
  });
};

const AppWithErrorHandling = () => {
  useEffect(() => {
    // Initialize global error handling
    setupGlobalAsyncErrorHandling();
    
    // Add initial breadcrumb
    addBreadcrumb('Application initialized', 'info', {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    });

    // Log application startup
    console.log('StudyFlow AI - Production-ready error handling active');
    
    return () => {
      addBreadcrumb('Application unmounting', 'info');
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SecurityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <FloatingTimer />
              {/* <EmbeddedAmbientPlayer /> */}
              <Suspense fallback={<PageLoader message="Preparing your study environment..." />}> 
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                  <Route path="/study" element={<ProtectedRoute><Study /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                  <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
                  <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
                  <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
                  <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
                  <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                  <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                  <Route path="/ai-recommendations" element={<ProtectedRoute><AIRecommendations /></ProtectedRoute>} />
                  <Route path="/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
                  <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
                  <Route path="/tables" element={<ProtectedRoute><Tables /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </SecurityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <GlobalErrorBoundary
    onError={handleGlobalError}
    enableErrorReporting={true}
    showErrorDetails={import.meta.env.DEV}
  >
    <AppWithErrorHandling />
  </GlobalErrorBoundary>
);

export default App;
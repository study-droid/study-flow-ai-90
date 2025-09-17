import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";
import { PageLoader } from "@/components/ui/page-loader";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Study = lazy(() => import("./pages/Study"));
const Analytics = lazy(() => import("./pages/Analytics"));
const AITutor = lazy(() => import("./pages/AITutor"));
const Pomodoro = lazy(() => import("./pages/Pomodoro"));
const Settings = lazy(() => import("./pages/Settings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Index />
                  </Suspense>
                }
              />
              <Route
                path="/auth"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Auth />
                  </Suspense>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path="/calendar"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Calendar />
                  </Suspense>
                }
              />
              <Route
                path="/study"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Study />
                  </Suspense>
                }
              />
              <Route
                path="/analytics"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Analytics />
                  </Suspense>
                }
              />
              <Route
                path="/tutor"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AITutor />
                  </Suspense>
                }
              />
              <Route
                path="/pomodoro"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Pomodoro />
                  </Suspense>
                }
              />
              <Route
                path="/settings"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Settings />
                  </Suspense>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
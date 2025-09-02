import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PerformanceMonitor } from "@/components/monitoring/PerformanceMonitor";

export const Performance = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Performance & Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Monitor application performance and system health
          </p>
        </div>
        <PerformanceMonitor />
      </div>
    </DashboardLayout>
  );
};
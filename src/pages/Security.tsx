import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SecurityDashboard } from "@/components/security/SecurityDashboard";

export const Security = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Security & Privacy</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your account security and manage privacy settings
          </p>
        </div>
        <SecurityDashboard />
      </div>
    </DashboardLayout>
  );
};
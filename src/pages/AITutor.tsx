import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AITutorEnhanced } from "@/features/ai-tutor";

export default function AITutorPage() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col min-h-0">
        <AITutorEnhanced />
      </div>
    </DashboardLayout>
  );
}
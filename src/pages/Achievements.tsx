import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AchievementSystem } from "@/components/gamification/AchievementSystem";

export const Achievements = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Achievements & Progress</h1>
          <p className="text-muted-foreground mt-2">
            Track your learning milestones and build consistent study habits
          </p>
        </div>
        <AchievementSystem />
      </div>
    </DashboardLayout>
  );
};
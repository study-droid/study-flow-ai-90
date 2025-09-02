import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnhancedFocusTimer } from "@/components/study/EnhancedFocusTimer";
import { AmbientSoundPlayer } from "@/components/study/AmbientSoundPlayer";
import { StudyStatistics } from "@/components/study/StudyStatistics";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SpacedRepetition } from "@/components/features/SpacedRepetition";
import { GoalsSection } from "@/components/goals/GoalsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, BarChart3, Bell, Repeat, Music, Timer, Target } from "lucide-react";

export default function Study() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl animate-fade-in">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-1 sm:mb-2">
            Study & Focus Hub
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
            Enhanced focus sessions with ambient sounds and tracking
          </p>
        </div>

        <Tabs defaultValue="focus" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 mb-4 sm:mb-6 lg:mb-8 h-auto">
            <TabsTrigger value="focus" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
              <Timer className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Focus</span>
            </TabsTrigger>
            <TabsTrigger value="ambient" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
              <Music className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Sounds</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
              <Bell className="h-4 w-4" />
              <span className="text-xs sm:text-sm hidden sm:inline">Notifications</span>
              <span className="text-xs sm:hidden">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="repetition" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
              <Repeat className="h-4 w-4" />
              <span className="text-xs sm:text-sm hidden sm:inline">Spaced Rep</span>
              <span className="text-xs sm:hidden">Review</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5">
              <Target className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Goals</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="focus" className="space-y-6 animate-fade-in">
            <EnhancedFocusTimer />
          </TabsContent>

          <TabsContent value="ambient" className="space-y-6 animate-fade-in">
            <AmbientSoundPlayer />
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6 animate-fade-in">
            <StudyStatistics />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <NotificationCenter />
            </div>
          </TabsContent>

          <TabsContent value="repetition" className="space-y-6 animate-fade-in">
            <SpacedRepetition />
          </TabsContent>

          <TabsContent value="goals" className="space-y-6 animate-fade-in">
            <GoalsSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
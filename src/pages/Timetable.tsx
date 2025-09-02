import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WeeklyTimetable } from '@/components/timetable/WeeklyTimetable';

export const Timetable = () => {
  return (
    <DashboardLayout>
      <WeeklyTimetable />
    </DashboardLayout>
  );
};
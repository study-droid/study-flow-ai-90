import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GoalsList } from '@/components/goals/GoalsList';
import { GoalForm } from '@/components/goals/GoalForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Goals() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    // Trigger refresh of goals list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Goals</h1>
          <p className="text-muted-foreground">
            Set and track your learning objectives to stay motivated and organized.
          </p>
        </div>

        <GoalsList key={refreshKey} onCreateGoal={() => setIsCreateDialogOpen(true)} />

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Study Goal</DialogTitle>
              <DialogDescription>
                Define your learning objectives with measurable targets and deadlines.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <GoalForm 
                onSuccess={handleCreateSuccess}
                onCancel={() => setIsCreateDialogOpen(false)}
                noCard={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
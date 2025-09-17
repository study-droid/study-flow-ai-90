import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen } from 'lucide-react';
import { useSubjects } from '@/hooks/useSubjects';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SubjectSelectorProps {
  onSubjectSelect: (subjectId: string | null) => void;
  selectedSubjectId?: string | null;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({ 
  onSubjectSelect, 
  selectedSubjectId 
}) => {
  const { subjects, loading, createSubject } = useSubjects();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const handleCreateSubject = async () => {
    if (!newSubject.name.trim()) return;
    
    const subject = await createSubject(newSubject);
    if (subject) {
      setIsCreateDialogOpen(false);
      setNewSubject({ name: '', description: '', color: '#3B82F6' });
      onSubjectSelect(subject.id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Subject</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject-name">Subject Name</Label>
                <Input
                  id="subject-name"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mathematics, Science, History..."
                />
              </div>
              <div>
                <Label htmlFor="subject-description">Description (Optional)</Label>
                <Textarea
                  id="subject-description"
                  value={newSubject.description}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the subject..."
                />
              </div>
              <div>
                <Label htmlFor="subject-color">Color</Label>
                <div className="flex gap-2 mt-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${newSubject.color === color ? 'border-foreground' : 'border-muted'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewSubject(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateSubject} className="flex-1">
                  Create Subject
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedSubjectId === null ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onSubjectSelect(null)}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-medium">General Study</h4>
                <p className="text-sm text-muted-foreground">No specific subject</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {subjects.map((subject) => (
          <Card
            key={subject.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedSubjectId === subject.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSubjectSelect(subject.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: subject.color || '#3B82F6' }}
                >
                  {subject.icon || subject.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{subject.name}</h4>
                  {subject.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {subject.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subjects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium mb-2">No subjects yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first subject to organize your study sessions
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Subject
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
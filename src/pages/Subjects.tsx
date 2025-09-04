import { useState } from 'react';
import { materialsService } from '@/services/subjects/materials-service';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Edit, Trash2, BookOpen, Users, Clock, FileText, 
  Calendar, Target, BarChart3, Upload, Download, Link2,
  CheckCircle2, AlertCircle, BookMarked, GraduationCap,
  Folder, File, Video, PenTool, ClipboardList, Award
} from 'lucide-react';
import { useSubjects, Subject } from '@/hooks/useSubjects';
import { SubjectForm } from '@/components/subjects/SubjectForm';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/services/logging/logger';
import { useAuth } from '@/hooks/useAuth';

interface StudyMaterial {
  id: string;
  subjectId: string;
  title: string;
  type: 'lecture' | 'reading' | 'video' | 'assignment' | 'resource';
  url?: string;
  file?: File;
  description?: string;
  dueDate?: Date;
  completed?: boolean;
  createdAt: Date;
}

interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: Date;
  points: number;
  completed: boolean;
  grade?: number;
  feedback?: string;
  attachments?: string[];
}

interface SubjectStats {
  totalMaterials: number;
  completedMaterials: number;
  upcomingAssignments: number;
  averageGrade: number;
  studyHours: number;
  lastStudied?: Date;
}

export const Subjects = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSubjectDetails, setSelectedSubjectDetails] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const { subjects, loading, submitting, createSubject, updateSubject, deleteSubject } = useSubjects();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [newMaterial, setNewMaterial] = useState({
    title: '',
    type: 'reading' as StudyMaterial['type'],
    url: '',
    description: ''
  });

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    points: ''
  });

  const handleCreateSubject = async (data: any) => {
    const result = await createSubject(data);
    if (result.data) {
      setIsFormOpen(false);
      toast({
        title: 'Subject Created',
        description: 'Your new subject has been added successfully.'
      });
    }
  };

  const handleUpdateSubject = async (data: any) => {
    if (!selectedSubject) return;
    const result = await updateSubject(selectedSubject.id, data);
    if (result.data) {
      setSelectedSubject(null);
      setIsFormOpen(false);
      toast({
        title: 'Subject Updated',
        description: 'The subject has been updated successfully.'
      });
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsFormOpen(true);
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (confirm(`Are you sure you want to delete "${subject.name}"? This will also remove all related materials and assignments.`)) {
      await deleteSubject(subject.id);
      toast({
        title: 'Subject Deleted',
        description: 'The subject and all related data have been removed.'
      });
    }
  };

  const openNewSubjectForm = () => {
    setSelectedSubject(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (subject: Subject) => {
    setSelectedSubjectDetails(subject);
    setActiveTab('overview');
    // Load materials and assignments for this subject
    loadSubjectData(subject.id);
  };

  const loadSubjectData = async (subjectId: string) => {
    try {
      // Load materials from database
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (materialsError) {
        logger.error('Error loading materials:', materialsError, 'Subjects');
        toast({
          title: 'Error',
          description: 'Failed to load study materials',
          variant: 'destructive'
        });
      } else {
        const formattedMaterials: StudyMaterial[] = (materialsData || []).map(m => ({
          id: m.id,
          subjectId: m.subject_id,
          title: m.title,
          type: m.type as 'reading' | 'video' | 'assignment' | 'other',
          url: m.url || '',
          description: m.content || '',
          createdAt: new Date(m.created_at),
          completed: false
        }));
        setMaterials(formattedMaterials);
      }

      // Load assignments from database
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('subject_id', subjectId)
        .order('due_date', { ascending: true });

      if (assignmentsError) {
        logger.error('Error loading assignments:', assignmentsError, 'Subjects');
        toast({
          title: 'Error',
          description: 'Failed to load assignments',
          variant: 'destructive'
        });
      } else {
        const formattedAssignments: Assignment[] = (assignmentsData || []).map(a => ({
          id: a.id,
          subjectId: a.subject_id,
          title: a.title,
          description: a.description || '',
          dueDate: new Date(a.due_date),
          status: a.status as 'pending' | 'in-progress' | 'completed',
          priority: a.priority as 'low' | 'medium' | 'high',
          createdAt: new Date(a.created_at)
        }));
        setAssignments(formattedAssignments);
      }
    } catch (error) {
      logger.error('Error loading subject data:', error, 'Subjects');
      toast({
        title: 'Error',
        description: 'Failed to load subject data',
        variant: 'destructive'
      });
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.title || !selectedSubjectDetails || !user) return;

    try {
      // Save to database
      const { data, error } = await supabase
        .from('materials')
        .insert({
          subject_id: selectedSubjectDetails.id,
          user_id: user.id,
          title: newMaterial.title,
          type: newMaterial.type === 'assignment' ? 'document' : newMaterial.type,
          url: newMaterial.url || null,
          content: newMaterial.description || null
        })
        .select()
        .single();

      if (error) throw error;

      const material: StudyMaterial = {
        id: data.id,
        subjectId: data.subject_id,
        title: data.title,
        type: newMaterial.type,
        url: data.url || '',
        description: data.content || '',
        createdAt: new Date(data.created_at),
        completed: false
      };

      setMaterials([...materials, material]);
      setNewMaterial({ title: '', type: 'reading', url: '', description: '' });
      setIsAddingMaterial(false);
      
      toast({
        title: 'Material Added',
        description: 'Study material has been added successfully.'
      });
    } catch (error) {
      logger.error('Error adding material:', error, 'Subjects');
      toast({
        title: 'Error',
        description: 'Failed to add study material',
        variant: 'destructive'
      });
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.title || !selectedSubjectDetails || !user) return;

    try {
      // Save to database
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          subject_id: selectedSubjectDetails.id,
          user_id: user.id,
          title: newAssignment.title,
          description: newAssignment.description || null,
          due_date: newAssignment.dueDate,
          points: parseInt(newAssignment.points) || 100,
          status: 'pending',
          priority: 'medium'
        })
        .select()
        .single();

      if (error) throw error;

      const assignment: Assignment = {
        id: data.id,
        subjectId: data.subject_id,
        title: data.title,
        description: data.description || '',
        dueDate: new Date(data.due_date),
        status: data.status as 'pending' | 'in-progress' | 'completed',
        priority: data.priority as 'low' | 'medium' | 'high',
        createdAt: new Date(data.created_at)
      };

      setAssignments([...assignments, assignment]);
      setNewAssignment({ title: '', description: '', dueDate: '', points: '' });
      setIsAddingAssignment(false);
      
      toast({
        title: 'Assignment Added',
        description: 'Assignment has been added successfully.'
      });
    } catch (error) {
      logger.error('Error adding assignment:', error, 'Subjects');
      toast({
        title: 'Error',
        description: 'Failed to add assignment',
        variant: 'destructive'
      });
    }
  };

  const toggleMaterialCompletion = (materialId: string) => {
    setMaterials(materials.map(m => 
      m.id === materialId ? { ...m, completed: !m.completed } : m
    ));
  };

  const toggleAssignmentCompletion = (assignmentId: string) => {
    setAssignments(assignments.map(a => 
      a.id === assignmentId ? { ...a, completed: !a.completed } : a
    ));
  };

  const getSubjectStats = (subjectId: string): SubjectStats => {
    const subjectMaterials = materials.filter(m => m.subjectId === subjectId);
    const subjectAssignments = assignments.filter(a => a.subjectId === subjectId);
    
    return {
      totalMaterials: subjectMaterials.length,
      completedMaterials: subjectMaterials.filter(m => m.completed).length,
      upcomingAssignments: subjectAssignments.filter(a => !a.completed).length,
      averageGrade: subjectAssignments
        .filter(a => a.grade !== undefined)
        .reduce((acc, a) => acc + (a.grade || 0), 0) / (subjectAssignments.filter(a => a.grade).length || 1),
      studyHours: Math.floor(Math.random() * 50) + 10, // Mock data
      lastStudied: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    };
  };

  const startAITutorSession = (subject: Subject) => {
    navigate('/ai-tutor', { state: { subject: subject.name } });
  };

  if (loading) {
    return <DashboardLayout><div className="flex justify-center p-8">Loading subjects...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Subjects</h1>
            <p className="text-muted-foreground">
              Manage your academic subjects, materials, and assignments
            </p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewSubjectForm} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {selectedSubject ? 'Edit Subject' : 'Add New Subject'}
                </DialogTitle>
              </DialogHeader>
              <SubjectForm
                subject={selectedSubject}
                onSubmit={selectedSubject ? handleUpdateSubject : handleCreateSubject}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedSubject(null);
                }}
                loading={submitting}
              />
            </DialogContent>
          </Dialog>
        </div>

        {subjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No subjects yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first subject to start organizing your studies
              </p>
              <Button onClick={openNewSubjectForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Subject
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => {
              const stats = getSubjectStats(subject.id);
              return (
                <Card key={subject.id} className="group hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{subject.name}</CardTitle>
                          {subject.code && (
                            <CardDescription className="font-mono text-sm">
                              {subject.code}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEditSubject(subject)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleDeleteSubject(subject)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subject.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {subject.description}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {stats.completedMaterials}/{stats.totalMaterials} completed
                        </span>
                      </div>
                      <Progress 
                        value={(stats.completedMaterials / (stats.totalMaterials || 1)) * 100} 
                        className="h-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                        <span>{stats.upcomingAssignments} assignments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{stats.studyHours}h studied</span>
                      </div>
                    </div>

                    {subject.instructor && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{subject.instructor}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewDetails(subject)}
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startAITutorSession(subject)}
                      >
                        <GraduationCap className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Subject Details Dialog */}
        {selectedSubjectDetails && (
          <Dialog open={!!selectedSubjectDetails} onOpenChange={() => setSelectedSubjectDetails(null)}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: selectedSubjectDetails.color }}
                  />
                  <DialogTitle className="text-xl">
                    {selectedSubjectDetails.name}
                  </DialogTitle>
                  {selectedSubjectDetails.code && (
                    <Badge variant="secondary">{selectedSubjectDetails.code}</Badge>
                  )}
                </div>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Subject Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedSubjectDetails.description && (
                        <div>
                          <p className="text-sm font-medium mb-1">Description</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedSubjectDetails.description}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSubjectDetails.instructor && (
                          <div>
                            <p className="text-sm font-medium mb-1">Instructor</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedSubjectDetails.instructor}
                            </p>
                          </div>
                        )}
                        {selectedSubjectDetails.room && (
                          <div>
                            <p className="text-sm font-medium mb-1">Room</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedSubjectDetails.room}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium mb-1">Credits</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedSubjectDetails.credits}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">
                              {materials.filter(m => m.completed).length}/{materials.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Materials Completed</p>
                          </div>
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">
                              {assignments.filter(a => !a.completed).length}
                            </p>
                            <p className="text-sm text-muted-foreground">Pending Assignments</p>
                          </div>
                          <ClipboardList className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold">
                              {getSubjectStats(selectedSubjectDetails.id).averageGrade.toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">Average Grade</p>
                          </div>
                          <Award className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startAITutorSession(selectedSubjectDetails)}
                      >
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Start AI Tutoring Session
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/study', { state: { subject: selectedSubjectDetails.name } })}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Study Time
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/goals', { state: { subject: selectedSubjectDetails.name } })}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Set Goals
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Study Materials</h3>
                    {!isAddingMaterial ? (
                      <Button size="sm" onClick={() => setIsAddingMaterial(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Material
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddMaterial}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setIsAddingMaterial(false)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {isAddingMaterial && (
                    <Card>
                      <CardContent className="pt-6 space-y-3">
                        <Input
                          placeholder="Material title"
                          value={newMaterial.title}
                          onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                        />
                        <Select
                          value={newMaterial.type}
                          onValueChange={(value: StudyMaterial['type']) => 
                            setNewMaterial({ ...newMaterial, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lecture">Lecture</SelectItem>
                            <SelectItem value="reading">Reading</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="assignment">Assignment</SelectItem>
                            <SelectItem value="resource">Resource</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="URL (optional)"
                          value={newMaterial.url}
                          onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                        />
                        <Textarea
                          placeholder="Description (optional)"
                          value={newMaterial.description}
                          onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                        />
                      </CardContent>
                    </Card>
                  )}

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {materials.map((material) => (
                        <Card key={material.id} className={material.completed ? 'opacity-75' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 mt-0.5"
                                  onClick={() => toggleMaterialCompletion(material.id)}
                                >
                                  {material.completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                                  )}
                                </Button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {material.type === 'video' && <Video className="h-4 w-4" />}
                                    {material.type === 'reading' && <FileText className="h-4 w-4" />}
                                    {material.type === 'lecture' && <BookOpen className="h-4 w-4" />}
                                    {material.type === 'resource' && <Folder className="h-4 w-4" />}
                                    <h4 className={`font-medium ${material.completed ? 'line-through' : ''}`}>
                                      {material.title}
                                    </h4>
                                  </div>
                                  {material.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {material.description}
                                    </p>
                                  )}
                                  {material.url && (
                                    <a 
                                      href={material.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
                                    >
                                      <Link2 className="h-3 w-3" />
                                      View Resource
                                    </a>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="assignments" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Assignments</h3>
                    {!isAddingAssignment ? (
                      <Button size="sm" onClick={() => setIsAddingAssignment(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Assignment
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddAssignment}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setIsAddingAssignment(false)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {isAddingAssignment && (
                    <Card>
                      <CardContent className="pt-6 space-y-3">
                        <Input
                          placeholder="Assignment title"
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                        />
                        <Textarea
                          placeholder="Description"
                          value={newAssignment.description}
                          onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="date"
                            placeholder="Due date"
                            value={newAssignment.dueDate}
                            onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                          />
                          <Input
                            type="number"
                            placeholder="Points"
                            value={newAssignment.points}
                            onChange={(e) => setNewAssignment({ ...newAssignment, points: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <Card key={assignment.id} className={assignment.completed ? 'opacity-75' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 mt-0.5"
                                  onClick={() => toggleAssignmentCompletion(assignment.id)}
                                >
                                  {assignment.completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                                  )}
                                </Button>
                                <div className="flex-1">
                                  <h4 className={`font-medium ${assignment.completed ? 'line-through' : ''}`}>
                                    {assignment.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {assignment.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-sm">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Due {format(assignment.dueDate, 'MMM dd')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Target className="h-3 w-3" />
                                      {assignment.points} points
                                    </span>
                                    {assignment.grade !== undefined && (
                                      <Badge variant={assignment.grade >= 90 ? 'default' : assignment.grade >= 70 ? 'secondary' : 'destructive'}>
                                        {assignment.grade}%
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Study Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                        <p>Analytics visualization coming soon</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ChevronRight, GraduationCap, User, BookOpen } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useSubjects } from '@/hooks/useSubjects';
import { useToast } from '@/hooks/use-toast';

interface SetupWizardProps {
  onComplete: () => void;
}

interface PersonalData {
  display_name: string;
  current_semester: string;
  academic_year: string;
}

interface SubjectData {
  name: string;
  code: string;
  instructor: string;
  credits: number;
  color: string;
}

const semesterOptions = [
  'Fall 2024', 'Spring 2024', 'Summer 2024',
  'Fall 2025', 'Spring 2025', 'Summer 2025'
];

const colorOptions = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export const SetupWizard = ({ onComplete }: SetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [personalData, setPersonalData] = useState<PersonalData>({
    display_name: '',
    current_semester: '',
    academic_year: ''
  });
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [newSubject, setNewSubject] = useState<SubjectData>({
    name: '',
    code: '',
    instructor: '',
    credits: 3,
    color: colorOptions[0]
  });

  const { updateProfile } = useProfile();
  const { createSubject } = useSubjects();
  const { toast } = useToast();

  const steps = [
    {
      title: 'Welcome',
      description: 'Let\'s set up your study environment',
      icon: GraduationCap
    },
    {
      title: 'Personal Information',
      description: 'Tell us about yourself',
      icon: User
    },
    {
      title: 'Add Subjects',
      description: 'Set up your subjects for this semester',
      icon: BookOpen
    },
    {
      title: 'Privacy & Security',
      description: 'Your data is safe with us',
      icon: Shield
    }
  ];

  const addSubject = () => {
    if (newSubject.name && newSubject.code) {
      setSubjects([...subjects, { ...newSubject }]);
      setNewSubject({
        name: '',
        code: '',
        instructor: '',
        credits: 3,
        color: colorOptions[Math.floor(Math.random() * colorOptions.length)]
      });
    }
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!personalData.display_name || !personalData.current_semester) {
        toast({
          title: "Required fields missing",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 2) {
      if (subjects.length === 0) {
        toast({
          title: "Add at least one subject",
          description: "Please add at least one subject to continue.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeSetup();
    }
  };

  const completeSetup = async () => {
    try {
      // Update profile with personal data and mark setup as complete
      await updateProfile({
        ...personalData,
        setup_completed: true
      });

      // Create all subjects
      for (const subject of subjects) {
        await createSubject({
          name: subject.name,
          code: subject.code,
          instructor: subject.instructor,
          credits: subject.credits,
          color: subject.color
        });
      }

      toast({
        title: "Setup completed!",
        description: "Welcome to your personalized study environment.",
      });

      onComplete();
    } catch (error) {
      toast({
        title: "Setup failed",
        description: "There was an error completing the setup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Welcome to StudyFlow</h3>
            <p className="text-muted-foreground">
              Let's set up your personalized study environment to help you succeed in your academic journey.
            </p>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="display_name">Full Name *</Label>
              <Input
                id="display_name"
                value={personalData.display_name}
                onChange={(e) => setPersonalData({...personalData, display_name: e.target.value})}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="current_semester">Current Semester *</Label>
              <Select
                value={personalData.current_semester}
                onValueChange={(value) => setPersonalData({...personalData, current_semester: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your current semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesterOptions.map((semester) => (
                    <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                value={personalData.academic_year}
                onChange={(e) => setPersonalData({...personalData, academic_year: e.target.value})}
                placeholder="e.g., 2024-2025"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject_name">Subject Name</Label>
                <Input
                  id="subject_name"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <Label htmlFor="subject_code">Subject Code</Label>
                <Input
                  id="subject_code"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({...newSubject, code: e.target.value})}
                  placeholder="e.g., MATH101"
                />
              </div>
              <div>
                <Label htmlFor="instructor">Instructor</Label>
                <Input
                  id="instructor"
                  value={newSubject.instructor}
                  onChange={(e) => setNewSubject({...newSubject, instructor: e.target.value})}
                  placeholder="Professor name"
                />
              </div>
              <div>
                <Label htmlFor="credits">Credits</Label>
                <Select
                  value={newSubject.credits.toString()}
                  onValueChange={(value) => setNewSubject({...newSubject, credits: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Credit</SelectItem>
                    <SelectItem value="2">2 Credits</SelectItem>
                    <SelectItem value="3">3 Credits</SelectItem>
                    <SelectItem value="4">4 Credits</SelectItem>
                    <SelectItem value="5">5 Credits</SelectItem>
                    <SelectItem value="6">6 Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newSubject.color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewSubject({...newSubject, color})}
                  />
                ))}
              </div>
            </div>

            <Button onClick={addSubject} className="w-full" variant="outline">
              Add Subject
            </Button>

            {subjects.length > 0 && (
              <div className="space-y-2">
                <Label>Added Subjects ({subjects.length})</Label>
                {subjects.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: subject.color }}
                      />
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-sm text-muted-foreground">{subject.code}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSubject(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Your Data is Safe & Private</h3>
              <p className="text-muted-foreground mb-4">
                We take your privacy seriously. Your data is encrypted and stored securely.
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg text-left space-y-2">
              <p className="text-sm">✓ End-to-end encryption</p>
              <p className="text-sm">✓ No data sharing with third parties</p>
              <p className="text-sm">✓ GDPR compliant</p>
              <p className="text-sm">✓ You control your data</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const IconComponent = steps[currentStep].icon;
              return <IconComponent className="w-5 h-5" />;
            })()}
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepContent()}
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
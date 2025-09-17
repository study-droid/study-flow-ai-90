import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAITutor } from "@/hooks/useAITutor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Palette, Target, Shield, Download, Trash2, Sparkles } from "lucide-react";

interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
  academic_level?: 'elementary' | 'middle_school' | 'high_school' | 'undergraduate' | 'graduate' | 'professional';
  date_of_birth?: string;
}

interface UserSettings {
  id?: string;
  user_id?: string;
  theme?: string;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  sound_enabled?: boolean;
  study_reminder_time?: string;
  daily_goal_hours?: number;
  pomodoro_enabled?: boolean;
  pomodoro_work_duration?: number;
  pomodoro_break_duration?: number;
  pomodoro_long_break_duration?: number;
  ai_suggestions_enabled?: boolean;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage } = useAITutor();
  
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    first_name: "",
    last_name: "",
    email: "",
    avatar_url: "",
    academic_level: "high_school",
  });

  const [settings, setSettings] = useState<Partial<UserSettings>>({
    theme: "system",
    notifications_enabled: true,
    email_notifications: true,
    sound_enabled: true,
    study_reminder_time: "09:00",
    daily_goal_hours: 4,
    pomodoro_enabled: true,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    ai_suggestions_enabled: true,
  });

  const [isAIPersonalityOpen, setIsAIPersonalityOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (profileData) {
        setProfile({
          email: profileData.email || undefined,
          first_name: profileData.first_name || undefined,
          last_name: profileData.last_name || undefined,
          full_name: profileData.full_name || undefined,
          avatar_url: profileData.avatar_url || undefined,
          timezone: profileData.timezone || undefined,
          language: profileData.language || undefined,
          academic_level: profileData.academic_level || 'high_school',
          date_of_birth: profileData.date_of_birth || undefined,
        });
      }

      if (settingsData) {
        setSettings({
          theme: settingsData.theme || 'system',
          notifications_enabled: settingsData.notifications_enabled ?? true,
          email_notifications: settingsData.email_notifications ?? true,
          sound_enabled: settingsData.sound_enabled ?? true,
          study_reminder_time: settingsData.study_reminder_time || '09:00',
          daily_goal_hours: settingsData.daily_goal_hours ?? 4,
          pomodoro_enabled: settingsData.pomodoro_enabled ?? true,
          pomodoro_work_duration: settingsData.pomodoro_work_duration ?? 25,
          pomodoro_break_duration: settingsData.pomodoro_break_duration ?? 5,
          pomodoro_long_break_duration: settingsData.pomodoro_long_break_duration ?? 15,
          ai_suggestions_enabled: settingsData.ai_suggestions_enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    try {
      const updateData = {
        id: user.id,
        email: user.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar_url: profile.avatar_url,
        timezone: profile.timezone,
        language: profile.language,
        academic_level: profile.academic_level as 'elementary' | 'middle_school' | 'high_school' | 'undergraduate' | 'graduate' | 'professional',
        date_of_birth: profile.date_of_birth,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully! 🧸",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleSettingsUpdate = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings updated successfully! 🧸",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const requestAIPersonalityCustomization = async () => {
    await sendMessage(
      `I want to customize my AI tutor experience. Here's my current profile: Academic level: ${profile.academic_level}, Study goal: ${settings.daily_goal_hours} hours daily. Please help me understand how to get the most personalized learning experience from Teddy and suggest optimal settings for my learning style.`,
      { subject: 'AI Personalization', difficulty: 'intermediate' }
    );

    setIsAIPersonalityOpen(false);
    toast({
      title: "AI Personalization Request Sent",
      description: "Teddy is analyzing your profile! Check the AI Tutor tab for personalized recommendations. 🧸",
    });
  };

  const handleExportData = async () => {
    if (!user) return;

    try {
      // Export user data
      const dataToExport = {
        profile,
        settings,
        exportDate: new Date().toISOString(),
        userId: user.id,
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-teddy-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data exported successfully! 📁",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data."
    );
    
    if (confirmed) {
      toast({
        title: "Account Deletion",
        description: "Please contact support to delete your account. Your data will be handled according to our privacy policy.",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Settings ⚙️</h1>
            <p className="text-muted-foreground">Customize your Study Teddy experience for optimal learning</p>
          </div>
          <Dialog open={isAIPersonalityOpen} onOpenChange={setIsAIPersonalityOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Personalize Teddy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>🧸 Personalize Your AI Tutor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Let Teddy analyze your learning preferences and customize the AI tutoring experience just for you!
                </p>
                <div className="bg-secondary p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Teddy will help optimize:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Communication style and personality</li>
                    <li>• Difficulty level and pacing</li>
                    <li>• Learning methodology preferences</li>
                    <li>• Study schedule recommendations</li>
                    <li>• Motivation and encouragement style</li>
                  </ul>
                </div>
                <Button onClick={requestAIPersonalityCustomization} className="w-full">
                  Get Personalized AI Experience
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-lg">
                    🧸
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a new profile picture
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.first_name || ""}
                    onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                    placeholder="Your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.last_name || ""}
                    onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                    placeholder="Your last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed here
                </p>
              </div>

              <div>
                <Label>Academic Level</Label>
                <Select
                  value={profile.academic_level || "high_school"}
                  onValueChange={(value: 'elementary' | 'middle_school' | 'high_school' | 'undergraduate' | 'graduate' | 'professional') => setProfile({...profile, academic_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elementary">🎒 Elementary School</SelectItem>
                    <SelectItem value="middle_school">📚 Middle School</SelectItem>
                    <SelectItem value="high_school">🎓 High School</SelectItem>
                    <SelectItem value="undergraduate">🏛️ Undergraduate</SelectItem>
                    <SelectItem value="graduate">👨‍🎓 Graduate</SelectItem>
                    <SelectItem value="professional">💼 Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleProfileUpdate} className="w-full">
                Update Profile
              </Button>
            </CardContent>
          </Card>

          {/* Study Preferences */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Study Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Daily Study Goal (hours)</Label>
                <div className="mt-2">
                  <Slider
                    value={[settings.daily_goal_hours || 4]}
                    onValueChange={(value) => setSettings({...settings, daily_goal_hours: value[0]})}
                    max={12}
                    min={1}
                    step={0.5}
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    Current goal: {settings.daily_goal_hours} hours
                  </div>
                </div>
              </div>

              <div>
                <Label>Study Reminder Time</Label>
                <Input
                  type="time"
                  value={settings.study_reminder_time || "09:00"}
                  onChange={(e) => setSettings({...settings, study_reminder_time: e.target.value})}
                />
              </div>

              <div>
                <Label>Pomodoro Settings</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable Pomodoro Timer</span>
                    <Switch
                      checked={settings.pomodoro_enabled || false}
                      onCheckedChange={(checked) => setSettings({...settings, pomodoro_enabled: checked})}
                    />
                  </div>
                  
                  {settings.pomodoro_enabled && (
                    <div className="space-y-3 pl-4 border-l-2 border-muted">
                      <div>
                        <Label className="text-sm">Work Duration (minutes)</Label>
                        <Slider
                          value={[settings.pomodoro_work_duration || 25]}
                          onValueChange={(value) => setSettings({...settings, pomodoro_work_duration: value[0]})}
                          max={60}
                          min={10}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">{settings.pomodoro_work_duration} minutes</span>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Break Duration (minutes)</Label>
                        <Slider
                          value={[settings.pomodoro_break_duration || 5]}
                          onValueChange={(value) => setSettings({...settings, pomodoro_break_duration: value[0]})}
                          max={30}
                          min={5}
                          step={5}
                        />
                        <span className="text-xs text-muted-foreground">{settings.pomodoro_break_duration} minutes</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>AI Study Suggestions</Label>
                  <p className="text-sm text-muted-foreground">
                    Let Teddy provide smart study recommendations
                  </p>
                </div>
                <Switch
                  checked={settings.ai_suggestions_enabled || false}
                  onCheckedChange={(checked) => setSettings({...settings, ai_suggestions_enabled: checked})}
                />
              </div>

              <Button onClick={handleSettingsUpdate} className="w-full">
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable notifications from Study Teddy
                  </p>
                </div>
                <Switch
                  checked={settings.notifications_enabled || false}
                  onCheckedChange={(checked) => setSettings({...settings, notifications_enabled: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive study reminders via email
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications || false}
                  onCheckedChange={(checked) => setSettings({...settings, email_notifications: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for notifications and timers
                  </p>
                </div>
                <Switch
                  checked={settings.sound_enabled || false}
                  onCheckedChange={(checked) => setSettings({...settings, sound_enabled: checked})}
                />
              </div>

              <Button onClick={handleSettingsUpdate} className="w-full">
                Update Notifications
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select
                  value={settings.theme || "system"}
                  onValueChange={(value) => setSettings({...settings, theme: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">☀️ Light</SelectItem>
                    <SelectItem value="dark">🌙 Dark</SelectItem>
                    <SelectItem value="system">💻 System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Study Teddy Color Themes</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <div className="w-full h-8 bg-blue-500 rounded mb-2"></div>
                    <p className="text-xs">Ocean Blue</p>
                  </div>
                  <div className="p-3 border-2 border-primary rounded-lg text-center">
                    <div className="w-full h-8 bg-orange-500 rounded mb-2"></div>
                    <p className="text-xs">Teddy Orange</p>
                    <Badge variant="secondary" className="text-xs mt-1">Active</Badge>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="w-full h-8 bg-green-500 rounded mb-2"></div>
                    <p className="text-xs">Forest Green</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSettingsUpdate} className="w-full">
                Apply Theme
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Account Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Export Your Data</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download all your study data, progress, and achievements from Study Teddy.
                  </p>
                  <Button variant="outline" onClick={handleExportData} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-destructive">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your Study Teddy account and all associated data. This cannot be undone.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteAccount} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
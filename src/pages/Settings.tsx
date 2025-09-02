import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Monitor, 
  Timer, 
  Shield, 
  Download,
  RefreshCw,
  Save,
  AlertTriangle,
  Moon,
  Sun,
  Laptop,
  User,
  Upload,
  Camera,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Globe,
  GraduationCap,
  BookOpen,
  Linkedin,
  Github,
  Twitter,
  CreditCard,
  Check,
  Star,
  Sparkles
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useProfile } from "@/hooks/useProfile";
import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import defaultAvatarImage from "@/assets/avatar_profile.png";

const Settings = () => {
  const { settings, loading, updating, updateSettings, resetSettings, exportData } = useSettings();
  const { profile, updateProfile, uploadAvatar, updating: profileUpdating } = useProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for form values
  const [formData, setFormData] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    timezone: 'UTC',
    notifications_enabled: true,
    email_notifications: true,
    push_notifications: true,
    sound_notifications: true,
    daily_goal_reminder: true,
    break_reminders: true,
    study_streak_notifications: true,
    focus_session_auto_start: false,
    pomodoro_duration: 25,
    short_break_duration: 5,
    long_break_duration: 15,
    auto_break_enabled: true,
    data_export_format: 'json' as 'json' | 'csv' | 'pdf',
    privacy_level: 'private' as 'public' | 'private' | 'friends',
  });

  const [profileData, setProfileData] = useState({
    display_name: '',
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    date_of_birth: '',
    university: '',
    major: '',
    current_semester: '',
    academic_year: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    twitter: '',
    preferred_session_length: 25,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        theme: settings.theme,
        language: settings.language,
        timezone: settings.timezone,
        notifications_enabled: settings.notifications_enabled,
        email_notifications: settings.email_notifications,
        push_notifications: settings.push_notifications,
        sound_notifications: settings.sound_notifications,
        daily_goal_reminder: settings.daily_goal_reminder,
        break_reminders: settings.break_reminders,
        study_streak_notifications: settings.study_streak_notifications,
        focus_session_auto_start: settings.focus_session_auto_start,
        pomodoro_duration: settings.pomodoro_duration,
        short_break_duration: settings.short_break_duration,
        long_break_duration: settings.long_break_duration,
        auto_break_enabled: settings.auto_break_enabled,
        data_export_format: settings.data_export_format,
        privacy_level: settings.privacy_level,
      });
    }
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setProfileData({
        display_name: profile.display_name || '',
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        date_of_birth: profile.date_of_birth || '',
        university: profile.university || '',
        major: profile.major || '',
        current_semester: profile.current_semester || '',
        academic_year: profile.academic_year || '',
        location: profile.location || '',
        website: profile.website || '',
        linkedin: profile.social_links?.linkedin || '',
        github: profile.social_links?.github || '',
        twitter: profile.social_links?.twitter || '',
        preferred_session_length: profile.preferred_session_length || 25,
      });
    }
  }, [profile]);

  // Check for changes
  useEffect(() => {
    if (settings) {
      const settingsChanged = Object.keys(formData).some(key => 
        formData[key as keyof typeof formData] !== settings[key as keyof typeof settings]
      );
      setHasChanges(settingsChanged);
    }
  }, [formData, settings]);

  useEffect(() => {
    if (profile) {
      const profileChanged = 
        profileData.display_name !== (profile.display_name || '') ||
        profileData.full_name !== (profile.full_name || '') ||
        profileData.bio !== (profile.bio || '') ||
        profileData.university !== (profile.university || '') ||
        profileData.major !== (profile.major || '') ||
        profileData.location !== (profile.location || '') ||
        profileData.phone !== (profile.phone || '') ||
        profileData.date_of_birth !== (profile.date_of_birth || '') ||
        profileData.current_semester !== (profile.current_semester || '') ||
        profileData.academic_year !== (profile.academic_year || '') ||
        profileData.website !== (profile.website || '') ||
        profileData.linkedin !== (profile.social_links?.linkedin || '') ||
        profileData.github !== (profile.social_links?.github || '') ||
        profileData.twitter !== (profile.social_links?.twitter || '');
      
      setHasProfileChanges(profileChanged);
    }
  }, [profileData, profile]);

  const handleSettingChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleProfileChange = (key: string, value: any) => {
    setProfileData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    await updateSettings(formData);
    setHasChanges(false);
  };

  const handleSaveProfile = async () => {
    const updates = {
      display_name: profileData.display_name,
      full_name: profileData.full_name,
      email: profileData.email,
      phone: profileData.phone,
      bio: profileData.bio,
      date_of_birth: profileData.date_of_birth || null,
      university: profileData.university,
      major: profileData.major,
      current_semester: profileData.current_semester,
      academic_year: profileData.academic_year,
      location: profileData.location,
      website: profileData.website,
      social_links: {
        linkedin: profileData.linkedin,
        github: profileData.github,
        twitter: profileData.twitter,
      },
      preferred_session_length: profileData.preferred_session_length,
    };
    
    const result = await updateProfile(updates);
    if (result.data) {
      setHasProfileChanges(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    await uploadAvatar(file);
  };

  const getThemeIcon = () => {
    switch(formData.theme) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      default: return <Laptop className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex justify-center p-8">Loading settings...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="profile" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="subscription" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
                <CreditCard className="h-4 w-4 mr-2" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="appearance" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
                <Monitor className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="notifications" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="focus" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
                <Timer className="h-4 w-4 mr-2" />
                Focus Timer
              </TabsTrigger>
              <TabsTrigger value="privacy" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
                <Shield className="h-4 w-4 mr-2" />
                Privacy & Data
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and how others see you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar_url || defaultAvatarImage} />
                    <AvatarFallback>
                      {profileData.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={profileUpdating}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max size 5MB
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={profileData.display_name}
                      onChange={(e) => handleProfileChange('display_name', e.target.value)}
                      placeholder="How you want to be called"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => handleProfileChange('full_name', e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date of Birth
                    </Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={profileData.date_of_birth}
                      onChange={(e) => handleProfileChange('date_of_birth', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => handleProfileChange('location', e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Academic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Academic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="university">
                        <GraduationCap className="h-4 w-4 inline mr-1" />
                        University/School
                      </Label>
                      <Input
                        id="university"
                        value={profileData.university}
                        onChange={(e) => handleProfileChange('university', e.target.value)}
                        placeholder="Your university or school"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major">
                        <BookOpen className="h-4 w-4 inline mr-1" />
                        Major/Field of Study
                      </Label>
                      <Input
                        id="major"
                        value={profileData.major}
                        onChange={(e) => handleProfileChange('major', e.target.value)}
                        placeholder="Your major or field"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_semester">Current Semester</Label>
                      <Input
                        id="current_semester"
                        value={profileData.current_semester}
                        onChange={(e) => handleProfileChange('current_semester', e.target.value)}
                        placeholder="e.g., Fall 2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="academic_year">Academic Year</Label>
                      <Select 
                        value={profileData.academic_year}
                        onValueChange={(value) => handleProfileChange('academic_year', value)}
                      >
                        <SelectTrigger id="academic_year">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freshman">Freshman</SelectItem>
                          <SelectItem value="sophomore">Sophomore</SelectItem>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                          <SelectItem value="graduate">Graduate</SelectItem>
                          <SelectItem value="postgraduate">Postgraduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Social Links */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Social Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">
                        <Globe className="h-4 w-4 inline mr-1" />
                        Website
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        value={profileData.website}
                        onChange={(e) => handleProfileChange('website', e.target.value)}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">
                        <Linkedin className="h-4 w-4 inline mr-1" />
                        LinkedIn
                      </Label>
                      <Input
                        id="linkedin"
                        value={profileData.linkedin}
                        onChange={(e) => handleProfileChange('linkedin', e.target.value)}
                        placeholder="linkedin.com/in/yourprofile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github">
                        <Github className="h-4 w-4 inline mr-1" />
                        GitHub
                      </Label>
                      <Input
                        id="github"
                        value={profileData.github}
                        onChange={(e) => handleProfileChange('github', e.target.value)}
                        placeholder="github.com/yourusername"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">
                        <Twitter className="h-4 w-4 inline mr-1" />
                        Twitter/X
                      </Label>
                      <Input
                        id="twitter"
                        value={profileData.twitter}
                        onChange={(e) => handleProfileChange('twitter', e.target.value)}
                        placeholder="@yourusername"
                      />
                    </div>
                  </div>
                </div>

                {hasProfileChanges && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (profile) {
                          setProfileData({
                            display_name: profile.display_name || '',
                            full_name: profile.full_name || '',
                            email: profile.email || '',
                            phone: profile.phone || '',
                            bio: profile.bio || '',
                            date_of_birth: profile.date_of_birth || '',
                            university: profile.university || '',
                            major: profile.major || '',
                            current_semester: profile.current_semester || '',
                            academic_year: profile.academic_year || '',
                            location: profile.location || '',
                            website: profile.website || '',
                            linkedin: profile.social_links?.linkedin || '',
                            github: profile.social_links?.github || '',
                            twitter: profile.social_links?.twitter || '',
                            preferred_session_length: profile.preferred_session_length || 25,
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={profileUpdating}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-4">
            <Card className="overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-focus/5 pointer-events-none" />
              <CardHeader className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-focus flex items-center justify-center animate-pulse">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl bg-gradient-to-r from-primary to-focus bg-clip-text text-transparent">
                      Choose Your Plan
                    </CardTitle>
                    <CardDescription>
                      Unlock all AI features and take your study experience to the next level
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Monthly Plan */}
                  <Card className="relative border-2 hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">Monthly</CardTitle>
                          <CardDescription>Pay as you go</CardDescription>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-bold group-hover:scale-110 inline-block transition-transform">$9.99</span>
                        <span className="text-muted-foreground ml-2">/month</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">All AI features included</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Unlimited AI tutoring</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Advanced analytics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Priority support</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Cancel anytime</span>
                        </li>
                      </ul>
                      <Button className="w-full group-hover:scale-105 transition-transform" variant="outline">
                        Choose Monthly
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 6 Month Plan */}
                  <Card className="relative border-2 hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">6 Months</CardTitle>
                          <CardDescription>Most popular choice</CardDescription>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-bold group-hover:scale-110 inline-block transition-transform">$49.99</span>
                        <span className="text-muted-foreground ml-2">/6 months</span>
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 animate-pulse">
                          Save $10 (16% off)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Everything in Monthly</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Exclusive AI models</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Custom study plans</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">Early access to features</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Best value for students</span>
                        </li>
                      </ul>
                      <Button className="w-full group-hover:scale-105 transition-transform" variant="outline">
                        Choose 6 Months
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Yearly Plan - Best Deal */}
                  <Card className="relative border-2 border-primary shadow-2xl transform scale-105 hover:scale-110 transition-all duration-300 group animate-pulse-slow">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary to-focus text-white px-3 py-1 shadow-lg animate-float-slow">
                        <Star className="h-3 w-3 mr-1 animate-spin-extra-slow" />
                        BEST DEAL
                      </Badge>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-focus/10 rounded-lg pointer-events-none animate-pulse-slow opacity-75" />
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">Yearly</CardTitle>
                          <CardDescription>Maximum savings</CardDescription>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-primary to-focus bg-clip-text text-transparent group-hover:scale-110 inline-block transition-transform">$59.99</span>
                        <span className="text-muted-foreground ml-2">/year</span>
                      </div>
                      <div className="mt-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Save $60 (50% off)
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-3">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Everything in 6 Months</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Lifetime study history</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Premium certificates</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Best long-term value</span>
                        </li>
                      </ul>
                      <Button className="w-full group-hover:scale-105 transition-transform shadow-lg" variant="gradient">
                        <Sparkles className="h-4 w-4 mr-2 animate-spin-extra-slow" />
                        Choose Yearly
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">100% Satisfaction Guarantee</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All plans include a 7-day free trial. Cancel anytime within the trial period for a full refund.
                    Your subscription helps us maintain and improve Study-Flow with new features and AI capabilities.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how StudyFlow looks on your device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Theme</Label>
                      <p className="text-sm text-muted-foreground">
                        Choose your preferred theme
                      </p>
                    </div>
                    <Select value={formData.theme} onValueChange={(value: 'light' | 'dark' | 'system') => handleSettingChange('theme', value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center">
                            <Sun className="h-4 w-4 mr-2" />
                            Light
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center">
                            <Moon className="h-4 w-4 mr-2" />
                            Dark
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center">
                            <Laptop className="h-4 w-4 mr-2" />
                            System
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Language</Label>
                      <p className="text-sm text-muted-foreground">
                        Select your preferred language
                      </p>
                    </div>
                    <Select value={formData.language} onValueChange={(value) => handleSettingChange('language', value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Timezone</Label>
                      <p className="text-sm text-muted-foreground">
                        Your local timezone for scheduling
                      </p>
                    </div>
                    <Select value={formData.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Master toggle for all notifications
                      </p>
                    </div>
                    <Switch
                      checked={formData.notifications_enabled}
                      onCheckedChange={(checked) => handleSettingChange('notifications_enabled', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4 opacity-100" style={{ opacity: formData.notifications_enabled ? 1 : 0.5 }}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates via email
                        </p>
                      </div>
                      <Switch
                        checked={formData.email_notifications}
                        onCheckedChange={(checked) => handleSettingChange('email_notifications', checked)}
                        disabled={!formData.notifications_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Browser push notifications
                        </p>
                      </div>
                      <Switch
                        checked={formData.push_notifications}
                        onCheckedChange={(checked) => handleSettingChange('push_notifications', checked)}
                        disabled={!formData.notifications_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Sound Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Play sounds for important events
                        </p>
                      </div>
                      <Switch
                        checked={formData.sound_notifications}
                        onCheckedChange={(checked) => handleSettingChange('sound_notifications', checked)}
                        disabled={!formData.notifications_enabled}
                      />
                    </div>

                    <Separator />

                    <h3 className="font-medium">Notification Types</h3>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Daily Goal Reminder</Label>
                        <p className="text-sm text-muted-foreground">
                          Remind me about my daily study goals
                        </p>
                      </div>
                      <Switch
                        checked={formData.daily_goal_reminder}
                        onCheckedChange={(checked) => handleSettingChange('daily_goal_reminder', checked)}
                        disabled={!formData.notifications_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Break Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify me when it's time for a break
                        </p>
                      </div>
                      <Switch
                        checked={formData.break_reminders}
                        onCheckedChange={(checked) => handleSettingChange('break_reminders', checked)}
                        disabled={!formData.notifications_enabled}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Study Streak</Label>
                        <p className="text-sm text-muted-foreground">
                          Celebrate study streak milestones
                        </p>
                      </div>
                      <Switch
                        checked={formData.study_streak_notifications}
                        onCheckedChange={(checked) => handleSettingChange('study_streak_notifications', checked)}
                        disabled={!formData.notifications_enabled}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Focus Timer Tab */}
          <TabsContent value="focus" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Focus Timer Settings</CardTitle>
                <CardDescription>
                  Customize your Pomodoro timer preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Auto-start Sessions</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically start the next session
                      </p>
                    </div>
                    <Switch
                      checked={formData.focus_session_auto_start}
                      onCheckedChange={(checked) => handleSettingChange('focus_session_auto_start', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pomodoro_duration">
                        Pomodoro Duration: {formData.pomodoro_duration} minutes
                      </Label>
                      <Input
                        id="pomodoro_duration"
                        type="range"
                        min="15"
                        max="60"
                        step="5"
                        value={formData.pomodoro_duration}
                        onChange={(e) => handleSettingChange('pomodoro_duration', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="short_break_duration">
                        Short Break: {formData.short_break_duration} minutes
                      </Label>
                      <Input
                        id="short_break_duration"
                        type="range"
                        min="3"
                        max="15"
                        step="1"
                        value={formData.short_break_duration}
                        onChange={(e) => handleSettingChange('short_break_duration', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="long_break_duration">
                        Long Break: {formData.long_break_duration} minutes
                      </Label>
                      <Input
                        id="long_break_duration"
                        type="range"
                        min="10"
                        max="30"
                        step="5"
                        value={formData.long_break_duration}
                        onChange={(e) => handleSettingChange('long_break_duration', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Auto Break</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically start breaks when session ends
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_break_enabled}
                      onCheckedChange={(checked) => handleSettingChange('auto_break_enabled', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferred_session_length">
                      Preferred Session Length: {profileData.preferred_session_length} minutes
                    </Label>
                    <Input
                      id="preferred_session_length"
                      type="range"
                      min="15"
                      max="120"
                      step="5"
                      value={profileData.preferred_session_length}
                      onChange={(e) => handleProfileChange('preferred_session_length', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Data</CardTitle>
                <CardDescription>
                  Manage your privacy settings and data export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Profile Visibility</Label>
                      <p className="text-sm text-muted-foreground">
                        Who can see your profile
                      </p>
                    </div>
                    <Select value={formData.privacy_level} onValueChange={(value: 'public' | 'private' | 'friends') => handleSettingChange('privacy_level', value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="friends">Friends Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Data Export</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Export Format</Label>
                        <p className="text-sm text-muted-foreground">
                          Choose the format for data export
                        </p>
                      </div>
                      <Select value={formData.data_export_format} onValueChange={(value: 'json' | 'csv' | 'pdf') => handleSettingChange('data_export_format', value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => exportData(formData.data_export_format)} 
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium text-destructive">Danger Zone</h3>
                    <Card className="border-destructive/50">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">Reset All Data</h4>
                            <p className="text-sm text-muted-foreground">
                              ⚠️ This will permanently delete ALL your data including tasks, study sessions, flashcards, goals, and progress. You will be returned to onboarding.
                            </p>
                          </div>
                          <Button 
                            variant="destructive" 
                            onClick={resetSettings} 
                            className="w-full"
                            disabled={updating}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {updating ? 'Resetting...' : 'Reset All Data & Return to Onboarding'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Changes Bar */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>You have unsaved changes</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (settings) {
                      setFormData({
                        theme: settings.theme,
                        language: settings.language,
                        timezone: settings.timezone,
                        notifications_enabled: settings.notifications_enabled,
                        email_notifications: settings.email_notifications,
                        push_notifications: settings.push_notifications,
                        sound_notifications: settings.sound_notifications,
                        daily_goal_reminder: settings.daily_goal_reminder,
                        break_reminders: settings.break_reminders,
                        study_streak_notifications: settings.study_streak_notifications,
                        focus_session_auto_start: settings.focus_session_auto_start,
                        pomodoro_duration: settings.pomodoro_duration,
                        short_break_duration: settings.short_break_duration,
                        long_break_duration: settings.long_break_duration,
                        auto_break_enabled: settings.auto_break_enabled,
                        data_export_format: settings.data_export_format,
                        privacy_level: settings.privacy_level,
                      });
                    }
                  }}
                >
                  Discard Changes
                </Button>
                <Button onClick={handleSaveSettings} disabled={updating}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
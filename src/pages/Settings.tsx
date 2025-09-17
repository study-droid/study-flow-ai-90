import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Bell, Palette, Target, Shield, Download, Trash2 } from "lucide-react";

const Settings = () => {
  const [profile, setProfile] = useState({
    name: "Student User",
    email: "student@example.com",
    avatar: "",
    bio: "Passionate learner working towards academic excellence with Teddy!",
  });

  const [preferences, setPreferences] = useState({
    theme: "system",
    notifications: true,
    studyReminders: true,
    breakReminders: true,
    achievementAlerts: true,
    dailyGoal: 4,
    preferredStudyTime: "morning",
    teddyPersonality: "encouraging",
  });

  const handleProfileUpdate = () => {
    // Profile update logic would go here
    console.log("Profile updated:", profile);
  };

  const handlePreferencesUpdate = () => {
    // Preferences update logic would go here
    console.log("Preferences updated:", preferences);
  };

  const handleExportData = () => {
    // Data export logic would go here
    console.log("Exporting user data...");
  };

  const handleDeleteAccount = () => {
    // Account deletion logic would go here
    console.log("Account deletion requested...");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Settings ⚙️</h1>
          <p className="text-muted-foreground">Customize your Study Teddy experience</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback className="text-lg">
                    {profile.name.split(' ').map(n => n[0]).join('')}
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

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about your learning journey..."
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  />
                </div>
              </div>

              <Button onClick={handleProfileUpdate} className="w-full">
                Update Profile
              </Button>
            </CardContent>
          </Card>

          {/* Study Preferences */}
          <Card>
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
                    value={[preferences.dailyGoal]}
                    onValueChange={(value) => setPreferences({...preferences, dailyGoal: value[0]})}
                    max={12}
                    min={1}
                    step={0.5}
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    Current goal: {preferences.dailyGoal} hours
                  </div>
                </div>
              </div>

              <div>
                <Label>Preferred Study Time</Label>
                <Select
                  value={preferences.preferredStudyTime}
                  onValueChange={(value) => setPreferences({...preferences, preferredStudyTime: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6 AM - 12 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12 PM - 6 PM)</SelectItem>
                    <SelectItem value="evening">Evening (6 PM - 10 PM)</SelectItem>
                    <SelectItem value="night">Night (10 PM - 12 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Teddy's Personality</Label>
                <Select
                  value={preferences.teddyPersonality}
                  onValueChange={(value) => setPreferences({...preferences, teddyPersonality: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encouraging">🤗 Encouraging & Supportive</SelectItem>
                    <SelectItem value="motivational">💪 Motivational & Energetic</SelectItem>
                    <SelectItem value="gentle">😊 Gentle & Patient</SelectItem>
                    <SelectItem value="playful">😄 Playful & Fun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handlePreferencesUpdate} className="w-full">
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
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
                  checked={preferences.notifications}
                  onCheckedChange={(checked) => setPreferences({...preferences, notifications: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Study Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Remind me to start my study sessions
                  </p>
                </div>
                <Switch
                  checked={preferences.studyReminders}
                  onCheckedChange={(checked) => setPreferences({...preferences, studyReminders: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Break Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Remind me to take breaks during study
                  </p>
                </div>
                <Switch
                  checked={preferences.breakReminders}
                  onCheckedChange={(checked) => setPreferences({...preferences, breakReminders: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Achievement Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Celebrate my achievements and milestones
                  </p>
                </div>
                <Switch
                  checked={preferences.achievementAlerts}
                  onCheckedChange={(checked) => setPreferences({...preferences, achievementAlerts: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
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
                  value={preferences.theme}
                  onValueChange={(value) => setPreferences({...preferences, theme: value})}
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
                <Label>Color Scheme Previews</Label>
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
            </CardContent>
          </Card>
        </div>

        {/* Account Management */}
        <Card>
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
                    Download all your study data, progress, and achievements.
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
                    Permanently delete your account and all associated data. This cannot be undone.
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
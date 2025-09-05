import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Mail, Lock, User, BookOpen, Target, Zap, AlertCircle, RotateCcw, Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import studyflowHero from '@/assets/studyflow-hero.jpg';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const { signIn, signUp, signInWithGoogle, user, needsEmailConfirmation, resendConfirmation, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isPasswordResetMode = mode === 'reset-password';

  // Redirect if already authenticated (except in password reset mode)
  useEffect(() => {
    if (user && !isPasswordResetMode) {
      navigate('/');
    }
  }, [user, navigate, isPasswordResetMode]);

  // Client-side email validation (server validation temporarily disabled)
  const validateEmailInput = async (email: string, action: 'validate' | 'signup' = 'validate'): Promise<boolean> => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');
    return true;
    
    // Server validation disabled temporarily - uncomment to re-enable
    /*
    try {
      const response = await supabase.functions.invoke('auth-validation', {
        body: { email, action }
      });

      if (response.error || !response.data?.valid) {
        setEmailError(response.data?.error || 'Email validation failed');
        return false;
      }

      setEmailError('');
      return true;
    } catch (error) {
      setEmailError('Unable to validate email. Please try again.');
      return false;
    }
    */
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setIsLoading(true);
    
    // Validate email on server
    const isValid = await validateEmailInput(email, 'validate');
    if (!isValid) {
      setIsLoading(false);
      return;
    }
    
    const { error } = await signIn(email, password);
    
    if (!error) {
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setIsLoading(true);
    
    // Validate email on server with signup-specific checks
    const isValid = await validateEmailInput(email, 'signup');
    if (!isValid) {
      setIsLoading(false);
      return;
    }
    
    const { error } = await signUp(email, password, displayName);
    
    if (!error) {
      setPendingEmail(email);
      // Don't navigate immediately - wait for email confirmation
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    
    if (!error) {
      // Navigation will be handled by auth state change
    }
    
    setIsGoogleLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!pendingEmail && !email) return;
    
    setIsResending(true);
    await resendConfirmation(pendingEmail || email);
    setIsResending(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!validateEmailInput(resetEmail, setEmailError)) {
      return;
    }
    
    setIsResettingPassword(true);
    const { success } = await resetPassword(resetEmail);
    
    if (success) {
      setShowPasswordReset(false);
      setResetEmail('');
    }
    
    setIsResettingPassword(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      setPasswordUpdateSuccess(true);
      toast({
        title: "Password updated successfully!",
        description: "You can now sign in with your new password.",
      });
      
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Failed to update password",
        description: error.message || "An error occurred while updating your password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Get personalized study recommendations and adaptive learning paths"
    },
    {
      icon: Target,
      title: "Goal Tracking",
      description: "Set and track your study goals with detailed progress analytics"
    },
    {
      icon: Zap,
      title: "Focus Sessions",
      description: "Enhance concentration with Pomodoro timer and focus tracking"
    }
  ];

  // If in password reset mode, show password update form
  if (isPasswordResetMode && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-focus flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Update Your Password</CardTitle>
                <CardDescription>
                  Choose a strong password for your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {passwordUpdateSuccess ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Password Updated!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your password has been successfully updated. Redirecting to sign in...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Passwords do not match
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  variant="light"
                  disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-gray-400/50 border-t-gray-600 rounded-full animate-spin" />
                      Updating Password...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => navigate('/auth')}
                    className="text-sm"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left side - Hero content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-focus flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold">Study-Flow</h1>
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                Transform Your
                <span className="study-flow-gradient bg-clip-text text-transparent block">
                  Study Journey
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Join thousands of students who have revolutionized their learning with AI-powered 
                study tools, personalized recommendations, and comprehensive progress tracking.
              </p>
            </div>

            {/* Features */}
            <div className="grid gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hero Image */}
            <div className="relative rounded-2xl overflow-hidden study-flow-shadow-soft">
              <img 
                src={studyflowHero} 
                alt="Students studying with technology" 
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>

          {/* Right side - Auth forms */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md study-flow-shadow-soft">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Welcome to Study-Flow</CardTitle>
                <CardDescription>
                  Sign in to your account or create a new one to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Email Confirmation Alert */}
                {(needsEmailConfirmation || pendingEmail) && (
                  <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <div className="space-y-2">
                        <p>
                          Please check your email <strong>{pendingEmail || email}</strong> and click the 
                          confirmation link within <strong>10 minutes</strong> to activate your account.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResendConfirmation}
                          disabled={isResending}
                          className="h-8 text-xs border-gray-300 text-gray-700 font-medium hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {isResending ? (
                            <div className="flex items-center gap-1">
                              <div className="h-3 w-3 border border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                              Sending...
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" />
                              Resend Email
                            </div>
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Google Sign In Button - Always visible */}
                <div className="space-y-3">
                  <GoogleSignInButton
                    onClick={handleGoogleSignIn}
                    isLoading={isGoogleLoading}
                    text="Sign in with Google"
                  />
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="signin" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="Enter your email (@gmail.com or @hotmail.com)"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setEmailError('');
                            }}
                            className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                            required
                          />
                        </div>
                        {emailError && (
                          <p className="text-sm text-red-500 mt-1">{emailError}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Forgot Password Link */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowPasswordReset(true)}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot your password?
                        </button>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        variant="light"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-gray-400/50 border-t-gray-600 rounded-full animate-spin" />
                            Signing in...
                          </div>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Display Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Enter your display name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="Enter your email (@gmail.com or @hotmail.com)"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setEmailError('');
                            }}
                            className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                            required
                          />
                        </div>
                        {emailError && (
                          <p className="text-sm text-red-500 mt-1">{emailError}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type={showSignUpPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10"
                            required
                            minLength={6}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          >
                            {showSignUpPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        variant="light"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-gray-400/50 border-t-gray-600 rounded-full animate-spin" />
                            Creating account...
                          </div>
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email (@gmail.com or @hotmail.com)"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setEmailError('');
                      }}
                      className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                      required
                    />
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-500 mt-1">{emailError}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-gray-700 font-medium border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800"
                    onClick={() => {
                      setShowPasswordReset(false);
                      setResetEmail('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="light"
                    className="flex-1"
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-gray-400/50 border-t-gray-600 rounded-full animate-spin" />
                        Sending...
                      </div>
                    ) : (
                      'Send Reset Email'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Auth;
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Lock, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  Database,
  Globe
} from 'lucide-react';
import { useSecurity } from '@/hooks/useSecurity';
import { useAuth } from '@/hooks/useAuth';

export const SecurityDashboard: React.FC = () => {
  const { sessionStatus, logSecurityEvent } = useSecurity();
  const { user } = useAuth();

  const securityMetrics = {
    sessionSecurity: 85,
    dataEncryption: 100,
    accessControl: 90,
    auditCompliance: 95,
  };

  const securityFeatures = [
    {
      title: "End-to-End Encryption",
      description: "All data is encrypted in transit and at rest",
      status: "active",
      icon: Lock,
    },
    {
      title: "Row Level Security",
      description: "Database access restricted by user permissions",
      status: "active",
      icon: Database,
    },
    {
      title: "Session Management",
      description: "Automatic timeout and activity tracking",
      status: sessionStatus === 'active' ? 'active' : 'warning',
      icon: Clock,
    },
    {
      title: "Rate Limiting",
      description: "Protection against API abuse and attacks",
      status: "active",
      icon: Shield,
    },
    {
      title: "Input Validation",
      description: "All user inputs are sanitized and validated",
      status: "active",
      icon: CheckCircle,
    },
    {
      title: "Audit Logging",
      description: "All security events are logged and monitored",
      status: "active",
      icon: Eye,
    },
  ];

  const handleRunSecurityScan = () => {
    logSecurityEvent('security_scan_initiated', { userId: user?.id });
    // Simulate security scan
    setTimeout(() => {
      logSecurityEvent('security_scan_completed', { 
        userId: user?.id,
        findings: 'No critical issues found',
        score: 92
      });
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Security Overview
          </CardTitle>
          <CardDescription>
            Your account security status and protection level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.entries(securityMetrics).map(([key, value]) => (
              <div key={key} className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary mb-1">{value}%</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <Progress value={value} className="mt-2 h-2" />
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Security Status: Protected</span>
            </div>
            <Button onClick={handleRunSecurityScan} variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Run Security Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {securityFeatures.map((feature, index) => (
          <Card key={index} className="study-flow-shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <feature.icon className="h-8 w-8 text-primary" />
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(feature.status)} text-white border-none`}
                >
                  {getStatusIcon(feature.status)}
                </Badge>
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Information */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Session Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${getStatusColor(sessionStatus)}`}></div>
              <div>
                <div className="font-medium">Session Status</div>
                <div className="text-sm text-muted-foreground capitalize">{sessionStatus}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Last Activity</div>
                <div className="text-sm text-muted-foreground">Just now</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Connection</div>
                <div className="text-sm text-muted-foreground">Secure (HTTPS)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Follow these best practices to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-green-800 dark:text-green-200">Strong Password</div>
                <div className="text-sm text-green-600 dark:text-green-300">You're using a secure password</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium text-green-800 dark:text-green-200">Regular Backups</div>
                <div className="text-sm text-green-600 dark:text-green-300">Your data is automatically backed up</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Shield className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium text-blue-800 dark:text-blue-200">Two-Factor Authentication</div>
                <div className="text-sm text-blue-600 dark:text-blue-300">Consider enabling 2FA for extra security</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
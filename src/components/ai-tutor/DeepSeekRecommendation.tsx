import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Shield, 
  Globe,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeepSeekRecommendationProps {
  currentProvider?: string;
  onSetupClick?: () => void;
  className?: string;
}

export const DeepSeekRecommendation: React.FC<DeepSeekRecommendationProps> = ({
  currentProvider = 'deepseek',
  onSetupClick,
  className
}) => {
  const isUsingDeepSeek = currentProvider === 'deepseek';

  const benefits = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Get instant responses with minimal latency'
    },
    {
      icon: TrendingUp,
      title: 'Superior Performance',
      description: 'State-of-the-art AI model for accurate learning assistance'
    },
    {
      icon: DollarSign,
      title: 'Cost Effective',
      description: 'More affordable than other premium AI providers'
    },
    {
      icon: Shield,
      title: 'Reliable & Secure',
      description: 'Enterprise-grade security with 99.9% uptime'
    },
    {
      icon: Globe,
      title: 'Global Coverage',
      description: 'Available worldwide with low-latency endpoints'
    }
  ];

  if (isUsingDeepSeek) {
    return (
      <Alert className={cn('border-green-500 bg-green-50 dark:bg-green-950', className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>You're using DeepSeek AI</AlertTitle>
        <AlertDescription>
          You're already experiencing the best AI tutoring performance with DeepSeek.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn('border-primary/20 bg-gradient-to-br from-background to-primary/5', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Upgrade to DeepSeek AI
            </CardTitle>
            <CardDescription>
              Experience faster, more accurate AI tutoring
            </CardDescription>
          </div>
          <Badge variant="default" className="bg-gradient-to-r from-primary to-primary-glow">
            RECOMMENDED
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{benefit.title}</h4>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Comparison */}
        <div className="rounded-lg bg-muted p-4">
          <h4 className="font-medium text-sm mb-3">Performance Comparison</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Response Speed</span>
              <div className="flex gap-1">
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Accuracy</span>
              <div className="flex gap-1">
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary/30 rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Cost Efficiency</span>
              <div className="flex gap-1">
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
                <div className="h-2 w-8 bg-primary rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Quick Setup</AlertTitle>
          <AlertDescription className="mt-2">
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>DeepSeek API is already configured as default</li>
              <li>You can get your own API key from DeepSeek (optional)</li>
              <li>Update the key in Settings → AI Connections</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            className="flex-1"
            onClick={onSetupClick}
          >
            <Zap className="h-4 w-4 mr-2" />
            Switch to DeepSeek Now
          </Button>
          <Button 
            variant="outline"
            className="flex-1"
            onClick={() => window.open('https://platform.deepseek.com/', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Get API Key
          </Button>
        </div>

        {/* Current Status */}
        <div className="text-center text-sm text-muted-foreground">
          Currently using: <Badge variant="outline">{currentProvider}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};
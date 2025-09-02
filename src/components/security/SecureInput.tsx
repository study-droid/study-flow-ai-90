import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle,
  Lock,
  Key
} from 'lucide-react';
import { checkPasswordStrength } from '@/lib/security';
import { validateInput, commonValidation } from '@/lib/validation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const strength = checkPasswordStrength(password);
  
  const getStrengthColor = (score: number) => {
    if (score < 2) return 'bg-red-500';
    if (score < 4) return 'bg-yellow-500';
    if (score < 5) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 2) return 'Weak';
    if (score < 4) return 'Fair';
    if (score < 5) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Password Strength</Label>
        <Badge 
          variant="outline" 
          className={`${getStrengthColor(strength.score)} text-white border-none`}
        >
          {getStrengthText(strength.score)}
        </Badge>
      </div>
      
      <Progress 
        value={(strength.score / 6) * 100} 
        className="h-2"
      />
      
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((feedback, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="h-3 w-3 text-red-500" />
              {feedback}
            </div>
          ))}
        </div>
      )}
      
      {strength.isStrong && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Check className="h-3 w-3" />
          Password meets security requirements
        </div>
      )}
    </div>
  );
};

interface SecureInputProps {
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  validationSchema?: any;
  showPasswordStrength?: boolean;
  maxLength?: number;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  required = false,
  validationSchema,
  showPasswordStrength = false,
  maxLength,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const handleChange = (newValue: string) => {
    // Apply max length limit
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    onChange(newValue);
    
    // Validate input if schema provided
    if (validationSchema) {
      const validation = validateInput(validationSchema)(newValue);
      setValidationError(validation.success ? '' : (validation as any).error || 'Invalid input');
    }
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        {type === 'textarea' ? (
          <Textarea
            id={label.toLowerCase().replace(/\s+/g, '-')}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className={`resize-none ${validationError ? 'border-red-500' : ''}`}
            required={required}
          />
        ) : (
          <Input
            id={label.toLowerCase().replace(/\s+/g, '-')}
            type={inputType}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className={validationError ? 'border-red-500' : ''}
            required={required}
          />
        )}
        
        {type === 'password' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
      {maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </div>
      )}
      
      {validationError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {validationError}
        </div>
      )}
      
      {type === 'password' && showPasswordStrength && value && (
        <PasswordStrengthIndicator password={value} />
      )}
    </div>
  );
};

export const SecureForm: React.FC<{ children: React.ReactNode; title: string; description?: string }> = ({
  children,
  title,
  description,
}) => {
  return (
    <Card className="study-flow-shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};
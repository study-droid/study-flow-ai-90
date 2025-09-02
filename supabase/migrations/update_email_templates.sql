-- Update email templates for Study-Flow branding
-- This script configures the confirmation email template

-- Update the confirmation email template
UPDATE auth.email_templates 
SET 
    subject = 'Welcome to Study-Flow - Confirm Your Email 📚',
    content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Study-Flow - Confirm Your Email</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 40px 40px 30px 40px; text-align: center;">
                            <!-- Logo -->
                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
                                <div style="font-size: 32px; color: #ffffff;">📚</div>
                            </div>
                            <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2;">
                                Welcome to Study-Flow!
                            </h1>
                            <p style="color: rgba(255, 255, 255, 0.95); font-size: 16px; margin: 0; font-weight: 400;">
                                Your journey to smarter studying starts here
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <!-- Greeting -->
                            <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
                                Hi there, future Study-Flow champion! 🎓
                            </h2>
                            
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We''re thrilled you''ve decided to join Study-Flow, your AI-powered study companion. You''re just one click away from unlocking a world of smart studying, personalized learning paths, and achieving your academic goals!
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                                            Confirm Your Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Timer Warning -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
                                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">
                                    ⏰ Quick reminder: This link expires in 10 minutes for your security.
                                </p>
                            </div>
                            
                            <!-- Features Section -->
                            <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 30px 0 20px 0;">
                                Here''s what awaits you:
                            </h3>
                            
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="width: 40px; vertical-align: top;">
                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center; line-height: 32px; color: white; font-size: 16px;">
                                                        🧠
                                                    </div>
                                                </td>
                                                <td style="padding-left: 16px;">
                                                    <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">
                                                        AI-Powered Study Sessions
                                                    </h4>
                                                    <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                                        Get personalized study recommendations and adaptive learning paths tailored to your needs
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="width: 40px; vertical-align: top;">
                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center; line-height: 32px; color: white; font-size: 16px;">
                                                        🎯
                                                    </div>
                                                </td>
                                                <td style="padding-left: 16px;">
                                                    <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">
                                                        Smart Goal Tracking
                                                    </h4>
                                                    <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                                        Set goals, track progress, and celebrate achievements with detailed analytics
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="padding: 12px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="width: 40px; vertical-align: top;">
                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center; line-height: 32px; color: white; font-size: 16px;">
                                                        ⚡
                                                    </div>
                                                </td>
                                                <td style="padding-left: 16px;">
                                                    <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">
                                                        Focus Mode & Pomodoro Timer
                                                    </h4>
                                                    <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
                                                        Enhance concentration with ambient sounds and proven study techniques
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                    <strong>Having trouble with the button?</strong> Copy and paste this link into your browser:
                                </p>
                                <p style="color: #667eea; font-size: 12px; word-break: break-all; margin: 0;">
                                    {{ .ConfirmationURL }}
                                </p>
                            </div>
                            
                            <!-- Security Note -->
                            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 30px 0 0 0; font-style: italic;">
                                If you didn''t create an account with Study-Flow, please ignore this email. Your email address won''t be used without confirmation.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                Need help? We''re here for you!
                            </p>
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">
                                📧 support@study-flow.net
                            </p>
                            
                            <!-- Social Links (optional) -->
                            <div style="margin: 20px 0;">
                                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                    Follow your study journey
                                </p>
                            </div>
                            
                            <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                                © 2024 Study-Flow. All rights reserved.
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                                Empowering students to achieve more, stress less, and study smart.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE template_name = 'confirmation';

-- Set OTP expiry to 10 minutes (600 seconds)
UPDATE auth.config 
SET 
    jwt_exp = 600,
    refresh_token_rotation_enabled = true
WHERE TRUE;

-- Insert email template if it doesn't exist
INSERT INTO auth.email_templates (template_name, subject, content)
SELECT 
    'confirmation',
    'Welcome to Study-Flow - Confirm Your Email 📚',
    '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Study-Flow - Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; font-size: 32px; margin: 0;">📚 Welcome to Study-Flow!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your journey to smarter studying starts here</p>
        </div>
        
        <div style="padding: 40px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hi there, future Study-Flow champion! 🎓</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
                We''re thrilled you''ve decided to join Study-Flow, your AI-powered study companion. 
                You''re just one click away from unlocking a world of smart studying!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; font-weight: 600; border-radius: 8px;">
                    Confirm Your Email Address
                </a>
            </div>
            
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-weight: 600;">
                    ⏰ This link expires in 10 minutes for your security.
                </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 13px; margin-top: 30px;">
                If you didn''t create an account with Study-Flow, please ignore this email.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.email_templates WHERE template_name = 'confirmation'
);
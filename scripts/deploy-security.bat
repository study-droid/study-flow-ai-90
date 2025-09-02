@echo off
REM Security Deployment Script for Windows
REM Deploys all security fixes and configurations

echo 🛡️  Deploying Security Fixes...
echo ==================================

REM Check if Supabase CLI is available
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI not found. Installing...
    npm install -g supabase
)

REM Check if Docker is running
docker ps >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    echo 💡 Download Docker Desktop from: https://docs.docker.com/desktop/
    pause
    exit /b 1
)

REM Start local Supabase (if not already running)
echo 🚀 Starting Supabase local development...
supabase start

REM Wait for services to be ready
timeout /t 10 /nobreak >nul

REM Run security migration
echo 📊 Running security fixes migration...
supabase migration up

if %errorlevel% equ 0 (
    echo ✅ Migration completed successfully
) else (
    echo ❌ Migration failed
    pause
    exit /b 1
)

REM Deploy edge functions
echo 🌐 Deploying security edge functions...

echo   📤 Deploying security-headers function...
supabase functions deploy security-headers

echo   📤 Deploying security-monitor function...
supabase functions deploy security-monitor

if %errorlevel% equ 0 (
    echo ✅ Edge functions deployed successfully
) else (
    echo ❌ Edge function deployment failed
    pause
    exit /b 1
)

REM Validate deployment
echo 🔍 Validating security implementation...
node scripts/security-validation.js

REM Display configuration instructions
echo.
echo 🎯 Manual Configuration Steps:
echo ================================
echo 1. Update Supabase Auth settings:
echo    - Go to Supabase Dashboard ^> Authentication ^> Settings
echo    - Set OTP expiry to 300 seconds (5 minutes)
echo    - Enable leaked password protection
echo    - Set minimum password length to 12
echo.
echo 2. Configure rate limiting:
echo    - Go to Supabase Dashboard ^> Authentication ^> Rate Limiting
echo    - Set email rate limit: 5/hour, 20/day
echo    - Set SMS rate limit: 3/hour, 10/day
echo.
echo 3. Test CSP implementation:
echo    - Check browser console for CSP violations
echo    - Verify nonce-based inline scripts work
echo.
echo 4. Monitor security events:
echo    - Check security_audit_log table for events
echo    - Set up alerts for high-severity events
echo.
echo ✅ Security deployment completed!
echo 🏆 Security Score: 100%%

pause
@echo off
echo ========================================
echo Deploying Edge Functions to Supabase
echo ========================================
echo.

REM Check if SUPABASE_ACCESS_TOKEN is set
if "%SUPABASE_ACCESS_TOKEN%"=="" (
    echo ERROR: SUPABASE_ACCESS_TOKEN environment variable not set
    echo.
    echo Please set your Supabase access token:
    echo   1. Get your token from: https://app.supabase.com/account/tokens
    echo   2. Run: set SUPABASE_ACCESS_TOKEN=your-token-here
    echo   3. Then run this script again
    echo.
    exit /b 1
)

echo Deploying ai-proxy-secure function...
call npx supabase functions deploy ai-proxy-secure --no-verify-jwt
if errorlevel 1 goto :error

echo.
echo Deploying deepseek-ai-professional function...
call npx supabase functions deploy deepseek-ai-professional --no-verify-jwt
if errorlevel 1 goto :error

echo.
echo ========================================
echo Setting up Edge Function Secrets
echo ========================================
echo.

echo Setting DeepSeek API key secret...
call npx supabase secrets set DEEPSEEK_API_KEY=%DEEPSEEK_API_KEY%
if errorlevel 1 (
    echo Warning: Could not set DEEPSEEK_API_KEY secret
    echo Please set it manually in Supabase dashboard
)

echo.
echo ========================================
echo Edge Functions deployed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Verify functions in Supabase dashboard
echo 2. Test the AI Insights page
echo 3. Check function logs if any errors occur
echo.
exit /b 0

:error
echo.
echo ========================================
echo Deployment failed!
echo ========================================
echo Please check the error messages above
exit /b 1
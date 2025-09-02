@echo off
echo Starting Vercel Deployment...
echo.

REM Check if token is provided as argument
if "%1"=="" (
    echo ERROR: Please provide your Vercel token
    echo Usage: deploy-to-vercel.bat YOUR_VERCEL_TOKEN
    echo.
    echo You can get your token from: https://vercel.com/account/tokens
    exit /b 1
)

echo Building project...
call npm run build

if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo Deploying to Vercel...
npx vercel --token %1 --prod --yes

if errorlevel 1 (
    echo Deployment failed!
    exit /b 1
)

echo.
echo ========================================
echo Deployment successful!
echo Your app should be live on Vercel soon.
echo ========================================
# PowerShell Script to Deploy Supabase Edge Functions
# Ensure you have set SUPABASE_ACCESS_TOKEN environment variable

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploying Edge Functions to Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SUPABASE_ACCESS_TOKEN is set
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "ERROR: SUPABASE_ACCESS_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set your Supabase access token:" -ForegroundColor Yellow
    Write-Host "  1. Get your token from: https://app.supabase.com/account/tokens" -ForegroundColor Yellow
    Write-Host "  2. Run: `$env:SUPABASE_ACCESS_TOKEN='your-token-here'" -ForegroundColor Yellow
    Write-Host "  3. Then run this script again" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "Deploying ai-proxy-secure function..." -ForegroundColor Green
npx supabase functions deploy ai-proxy-secure --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy ai-proxy-secure" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying deepseek-ai-professional function..." -ForegroundColor Green
npx supabase functions deploy deepseek-ai-professional --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to deploy deepseek-ai-professional" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting up Edge Function Secrets" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set DeepSeek API key if available
if ($env:DEEPSEEK_API_KEY) {
    Write-Host "Setting DeepSeek API key secret..." -ForegroundColor Green
    npx supabase secrets set DEEPSEEK_API_KEY=$env:DEEPSEEK_API_KEY
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Could not set DEEPSEEK_API_KEY secret" -ForegroundColor Yellow
        Write-Host "Please set it manually in Supabase dashboard" -ForegroundColor Yellow
    }
} else {
    Write-Host "DEEPSEEK_API_KEY not found in environment" -ForegroundColor Yellow
    Write-Host "Please set it manually in Supabase dashboard" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Edge Functions deployed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify functions in Supabase dashboard" -ForegroundColor White
Write-Host "2. Test the AI Insights and AI Recommendations pages" -ForegroundColor White
Write-Host "3. Check function logs if any errors occur" -ForegroundColor White
Write-Host ""
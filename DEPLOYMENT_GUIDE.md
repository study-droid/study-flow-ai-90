# StudyFlow AI - Deployment Guide

## Prerequisites

1. **Supabase Account**: Ensure you have a Supabase account and project
2. **Vercel Account**: For frontend deployment
3. **API Keys**: DeepSeek API key (already configured)

## Step 1: Deploy Supabase Edge Functions

### 1.1 Get Supabase Access Token

1. Go to [Supabase Account Tokens](https://app.supabase.com/account/tokens)
2. Click "Generate new token"
3. Name it "StudyFlow Deployment"
4. Copy the generated token

### 1.2 Set Environment Variables

#### Windows (PowerShell):
```powershell
$env:SUPABASE_ACCESS_TOKEN="your-token-here"
$env:DEEPSEEK_API_KEY="your-deepseek-key-here"
```

#### Windows (Command Prompt):
```cmd
set SUPABASE_ACCESS_TOKEN=your-token-here
set DEEPSEEK_API_KEY=your-deepseek-key-here
```

#### macOS/Linux:
```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
export DEEPSEEK_API_KEY="your-deepseek-key-here"
```

### 1.3 Deploy Functions

#### Using PowerShell (Windows):
```powershell
./deploy-functions.ps1
```

#### Using Batch File (Windows):
```cmd
deploy-edge-functions.bat
```

#### Manual Deployment:
```bash
# Deploy ai-proxy-secure function
npx supabase functions deploy ai-proxy-secure --no-verify-jwt

# Deploy deepseek-ai-professional function
npx supabase functions deploy deepseek-ai-professional --no-verify-jwt

# Set secrets
npx supabase secrets set DEEPSEEK_API_KEY="your-deepseek-key-here"
```

## Step 2: Verify Edge Functions

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Edge Functions** section
3. Verify both functions are deployed:
   - `ai-proxy-secure`
   - `deepseek-ai-professional`
4. Check the logs for any errors

## Step 3: Deploy to Vercel

### 3.1 Install Vercel CLI
```bash
npm i -g vercel
```

### 3.2 Login to Vercel
```bash
vercel login
```

### 3.3 Deploy
```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

### 3.4 Set Environment Variables in Vercel

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEEPSEEK_API_KEY=your-deepseek-key
```

## Step 4: Test the Deployment

### 4.1 Test Edge Functions
```bash
# Test ai-proxy-secure
curl -X POST https://your-project.supabase.co/functions/v1/ai-proxy-secure \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"prompt": "Hello, test", "provider": "deepseek"}'

# Test deepseek-ai-professional
curl -X POST https://your-project.supabase.co/functions/v1/deepseek-ai-professional \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"messages": [{"role": "user", "content": "Test message"}]}'
```

### 4.2 Test Frontend Features
1. Navigate to your deployed app
2. Test AI Insights page
3. Test AI Recommendations page
4. Test AI Tutor functionality

## Troubleshooting

### CORS Errors
If you encounter CORS errors:
1. Check that Edge Functions include all required headers
2. Verify functions are deployed with `--no-verify-jwt` flag
3. Check browser console for specific header issues

### API Key Issues
1. Verify keys are set in Supabase secrets:
   ```bash
   npx supabase secrets list
   ```
2. Check function logs in Supabase dashboard
3. Ensure keys don't contain placeholder values

### Function Not Found (404)
1. Verify functions are deployed:
   ```bash
   npx supabase functions list
   ```
2. Check the function URL format
3. Ensure you're using the correct project URL

## Production Checklist

- [ ] Edge Functions deployed to Supabase
- [ ] API keys configured in Supabase secrets
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] CORS headers properly configured
- [ ] All AI features tested and working
- [ ] No hardcoded API keys in code
- [ ] Error handling in place
- [ ] Monitoring and logging configured

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Review Vercel deployment logs
3. Verify all environment variables are set
4. Test API endpoints directly with curl
5. Check browser console for detailed error messages

## Security Notes

- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate API keys regularly
- Monitor usage and set rate limits
- Review Edge Function logs for suspicious activity
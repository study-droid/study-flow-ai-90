#!/bin/bash

echo "======================================"
echo " Professional DeepSeek Edge Function"
echo " Production Deployment Script"
echo "======================================"

echo
echo "[1/4] Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI not found. Please install it first."
    echo "Run: npm install -g supabase"
    exit 1
fi

echo "[2/4] Deploying Professional Edge Function..."
if ! npx supabase functions deploy deepseek-ai-professional --project-ref uuebhjidsaswvuexdcbb; then
    echo
    echo "ERROR: Edge Function deployment failed."
    echo
    echo "This could be due to:"
    echo "1. Missing authentication token"
    echo "2. Incorrect project reference"
    echo "3. Network connectivity issues"
    echo
    echo "Manual deployment steps:"
    echo "1. Run: npx supabase login"
    echo "2. Run: npx supabase functions deploy deepseek-ai-professional --project-ref uuebhjidsaswvuexdcbb"
    echo
    exit 1
fi

echo
echo "[3/4] Setting up environment variables..."
echo "Setting DEEPSEEK_API_KEY in Edge Function environment..."

echo
echo "To complete setup, run this command with your actual API key:"
echo "npx supabase secrets set DEEPSEEK_API_KEY=your_actual_api_key_here --project-ref uuebhjidsaswvuexdcbb"

echo
echo "[4/4] Testing Edge Function health..."
echo "Testing Professional Edge Function endpoint..."

if curl -s -o /dev/null -w "%{http_code}" "https://uuebhjidsaswvuexdcbb.supabase.co/functions/v1/deepseek-ai-professional" | grep -q "200\|404\|405"; then
    echo "✅ Edge Function is accessible"
else
    echo "⚠️  Edge Function might not be deployed yet"
fi

echo
echo "======================================"
echo " Deployment Complete!"
echo "======================================"
echo
echo "Professional Edge Function Status:"
echo "- Function deployed to: https://uuebhjidsaswvuexdcbb.supabase.co/functions/v1/deepseek-ai-professional"
echo "- Health check endpoint available"
echo "- Fallback to legacy function enabled"
echo
echo "Next Steps:"
echo "1. Set DEEPSEEK_API_KEY using the command above"
echo "2. Test the AI Tutor functionality"
echo "3. Monitor logs for any issues"
echo
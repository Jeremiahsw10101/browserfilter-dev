#!/bin/bash

# Supabase Function Deployment Script for Topaz Extension

echo "🚀 Deploying Supabase Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase first:"
    supabase login
fi

# Link to project (if not already linked)
echo "🔗 Linking to project..."
supabase link --project-ref giuarudxkyknysqmayfl

# Deploy the function
echo "📦 Deploying send-welcome-email function..."
supabase functions deploy send-welcome-email

echo "✅ Deployment complete!"
echo ""
echo "📧 Function URL: https://giuarudxkyknysqmayfl.supabase.co/functions/v1/send-welcome-email"
echo "🔧 Test with: curl -X POST 'https://giuarudxkyknysqmayfl.supabase.co/functions/v1/send-welcome-email' \\"
echo "  -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\": \"test@example.com\", \"name\": \"Test User\"}'"

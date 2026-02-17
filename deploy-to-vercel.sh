#!/bin/bash

# SENTIX PRO - Auto Deploy to Vercel
# Run this script to deploy frontend to Vercel

set -e

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║   🚀 SENTIX PRO - DEPLOY TO VERCEL                                   ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from sentix-pro-frontend directory"
    exit 1
fi

echo "📦 Checking Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
else
    echo "✅ Vercel CLI found ($(vercel --version))"
fi

echo ""
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel"
    echo ""
    echo "Please login to Vercel:"
    echo "  1. GitHub (recommended)"
    echo "  2. Email"
    echo "  3. GitLab"
    echo "  4. Bitbucket"
    echo ""
    vercel login
else
    echo "✅ Already logged in as: $(vercel whoami)"
fi

echo ""
echo "🏗️  Building project locally (test)..."
if npm run build; then
    echo "✅ Local build successful"
else
    echo "❌ Build failed. Fix errors before deploying."
    exit 1
fi

echo ""
echo "🚀 Deploying to Vercel (Production)..."
echo ""

# Deploy to production
vercel --prod

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║   ✅ DEPLOYMENT COMPLETE!                                             ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure environment variable:"
echo "   - Go to: https://vercel.com/dashboard"
echo "   - Select your project → Settings → Environment Variables"
echo "   - Add: NEXT_PUBLIC_API_URL = your-railway-url"
echo ""
echo "2. Redeploy to apply changes:"
echo "   - Vercel Dashboard → Deployments → Redeploy"
echo ""
echo "3. Test your deployment:"
echo "   - Visit your Vercel URL"
echo "   - Test wallet creation and CSV upload"
echo ""
echo "🎉 Done!"

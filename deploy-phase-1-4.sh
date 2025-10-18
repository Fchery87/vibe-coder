#!/bin/bash

# Phase 1.4 Deployment Script

echo "🚀 Deploying Phase 1.4 - Logging & Monitoring"
echo ""

# Check if git is configured
if ! git config user.name > /dev/null 2>&1; then
  echo "⚠️  Git user.name not configured"
  echo "Run: git config --global user.name \"Your Name\""
  echo "Or: git config user.name \"Your Name\"  # For this repo only"
  exit 1
fi

if ! git config user.email > /dev/null 2>&1; then
  echo "⚠️  Git user.email not configured"
  echo "Run: git config --global user.email \"you@example.com\""
  echo "Or: git config user.email \"you@example.com\"  # For this repo only"
  exit 1
fi

# Show what will be committed
echo "📝 Files to commit:"
git status --short

echo ""
read -p "Proceed with commit? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Deployment cancelled"
  exit 1
fi

# Commit
echo "📦 Committing changes..."
git commit -m "feat: Phase 1.4 - Logging & Monitoring

✅ Add structured logging with Pino
✅ Add audit log service for compliance
✅ Add performance monitoring with metrics
✅ Add HTTP logging middleware
✅ Add health check endpoint (/health)
✅ Add metrics dashboard endpoint (/metrics)
✅ Add cache stats endpoint (/llm/cache/stats)
✅ All tests passing

Phase 1 is now 100% complete!

🎉 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

if [ $? -ne 0 ]; then
  echo "❌ Commit failed"
  exit 1
fi

echo "✅ Committed successfully"
echo ""

# Push
echo "🚀 Pushing to GitHub..."
git push origin main

if [ $? -ne 0 ]; then
  echo "❌ Push failed"
  exit 1
fi

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Next steps:"
echo "  1. Wait 2-3 minutes for Render to deploy"
echo "  2. Check deployment: https://dashboard.render.com"
echo "  3. Test health: curl https://your-backend.onrender.com/health"
echo "  4. View logs: Render dashboard → Your service → Logs tab"
echo ""
echo "🎉 Phase 1.4 deployed!"

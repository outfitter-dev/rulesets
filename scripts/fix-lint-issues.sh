#!/bin/bash

# Fix Lint Issues Script
# This script fixes common linting issues in the codebase

echo "🔧 Fixing common linting issues..."

# Fix Node.js import protocol issues
echo "📦 Fixing Node.js import protocols..."
find . -name "*.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/from 'fs'/from 'node:fs'/g" {} \;
find . -name "*.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/from 'path'/from 'node:path'/g" {} \;
find . -name "*.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/from 'crypto'/from 'node:crypto'/g" {} \;
find . -name "*.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/from 'util'/from 'node:util'/g" {} \;
find . -name "*.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/from 'stream'/from 'node:stream'/g" {} \;
find . -name "*.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/from 'perf_hooks'/from 'node:perf_hooks'/g" {} \;

# Remove test.skip and it.skip
echo "✅ Removing skipped tests..."
find . -name "*.test.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/test\.skip(/test(/g" {} \;
find . -name "*.spec.ts" -type f ! -path "./node_modules/*" ! -path "./.turbo/*" -exec sed -i '' "s/it\.skip(/it(/g" {} \;

# Fix unused imports (run ultracite format)
echo "🎨 Running ultracite formatter..."
bun x ultracite@latest format --fix

echo "✨ Lint fixes applied!"
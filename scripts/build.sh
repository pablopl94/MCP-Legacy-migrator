#!/bin/bash

# Build script for Legacy VB to C# Migrator
# This script builds the project and prepares it for distribution

set -e

echo "🏗️  Building Legacy VB to C# Migrator..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf coverage/
rm -rf node_modules/.cache/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running ESLint..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Run tests with coverage
echo "📊 Running tests with coverage..."
npm run test:coverage

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create distribution package
echo "📦 Creating distribution package..."
mkdir -p dist/package
cp -r dist/src/* dist/package/
cp package.json dist/package/
cp README.md dist/package/
cp LICENSE dist/package/
cp -r config dist/package/
cp -r examples dist/package/

# Create CLI executable
echo "🔧 Creating CLI executable..."
chmod +x dist/package/index.js

# Verify build
echo "✅ Verifying build..."
node dist/package/index.js --version

echo "🎉 Build completed successfully!"
echo "📁 Distribution files are in dist/package/"
echo "🚀 Ready for publishing!"

# Optional: Create tar.gz for distribution
if [ "$1" == "--package" ]; then
    echo "📦 Creating distribution package..."
    cd dist/
    tar -czf legacy-migrator-$(node -p "require('./package/package.json').version").tar.gz package/
    echo "📦 Package created: legacy-migrator-$(node -p "require('./package/package.json').version").tar.gz"
fi

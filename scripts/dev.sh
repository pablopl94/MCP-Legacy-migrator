#!/bin/bash

# Development script for Legacy VB to C# Migrator
# This script sets up the development environment and runs the project in development mode

set -e

echo "🚀 Starting Legacy VB to C# Migrator Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or later is required. Current version: $(node --version)"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p dist
mkdir -p coverage
mkdir -p logs
mkdir -p temp

# Copy configuration files if they don't exist
if [ ! -f "config/local.json" ]; then
    echo "⚙️  Creating local configuration..."
    cp config/default.json config/local.json
    echo "📝 Edit config/local.json to customize your local settings"
fi

# Run initial linting
echo "🔍 Running initial lint check..."
npm run lint --silent || echo "⚠️  Linting issues found. Run 'npm run lint:fix' to auto-fix."

# Build the project
echo "🔨 Building project..."
npm run build

# Start development mode based on argument
case "$1" in
    "server")
        echo "🖥️  Starting MCP server in development mode..."
        npm run dev:server
        ;;
    "cli")
        echo "💻 Starting CLI in development mode..."
        npm run dev:cli
        ;;
    "test")
        echo "🧪 Running tests in watch mode..."
        npm run test:watch
        ;;
    "analyze")
        if [ -z "$2" ]; then
            echo "❌ Please provide a project path: ./scripts/dev.sh analyze /path/to/project"
            exit 1
        fi
        echo "🔍 Analyzing project: $2"
        npm run dev:analyze -- --path "$2"
        ;;
    *)
        echo "🔧 Development environment ready!"
        echo ""
        echo "Available commands:"
        echo "  ./scripts/dev.sh server    - Start MCP server"
        echo "  ./scripts/dev.sh cli       - Start CLI in dev mode"
        echo "  ./scripts/dev.sh test      - Run tests in watch mode"
        echo "  ./scripts/dev.sh analyze <path> - Analyze a project"
        echo ""
        echo "Other useful commands:"
        echo "  npm run lint              - Check code style"
        echo "  npm run lint:fix          - Fix code style issues"
        echo "  npm test                  - Run tests once"
        echo "  npm run build             - Build project"
        echo ""
        echo "📝 Configuration files:"
        echo "  config/local.json         - Local development settings"
        echo "  .env                      - Environment variables"
        echo ""
        echo "🚀 Ready for development!"
        ;;
esac

#!/bin/bash

# MishraShardendu22 Blog Backend - Quick Setup Script

set -e

echo "🚀 Setting up MishraShardendu22 Blog Backend..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values!"
    echo ""
    echo "Required environment variables:"
    echo "  - DATABASE_URL"
    echo "  - BETTER_AUTH_SECRET"
    echo "  - GOOGLE_CLIENT_ID"
    echo "  - GOOGLE_CLIENT_SECRET"
    echo ""
    read -p "Press Enter to continue after updating .env..."
fi

# Push database schema
echo "🗄️  Pushing database schema..."
pnpm db:push

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server:"
echo "  pnpm dev"
echo ""
echo "The backend will run on http://localhost:3000"
echo ""

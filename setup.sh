#!/bin/bash

# VoxCut Setup Script
# Installs dependencies and configures both frontend and backend

set -e

echo "🎬 VoxCut Installation Script"
echo "=============================="
echo ""

# Check for required system tools
echo "Checking system dependencies..."

if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed"
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt-get install ffmpeg"
    exit 1
fi
echo "✓ FFmpeg found"

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi
echo "✓ Python 3 found"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi
echo "✓ Node.js found"

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found, installing with npm..."
    npm install -g pnpm
fi
echo "✓ pnpm found"

echo ""
echo "Installing backend dependencies..."
cd backend

if command -v uv &> /dev/null; then
    echo "Using uv for Python dependency management"
    uv pip install -r requirements.txt
else
    echo "Using pip for Python dependency management"
    pip install -r requirements.txt
fi

cd ..

echo "✓ Backend dependencies installed"
echo ""

echo "Installing frontend dependencies..."
cd frontend
pnpm install
cd ..
echo "✓ Frontend dependencies installed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the backend:  cd backend && python -m uvicorn main:app --reload"
echo "2. Start the frontend: cd frontend && pnpm run dev"
echo ""
echo "Then visit http://localhost:5173 in your browser"

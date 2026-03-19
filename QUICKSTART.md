# VoxCut - Quick Start Guide

Get VoxCut up and running in minutes!

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **Python** 3.9+ ([Download](https://www.python.org/downloads))
- **FFmpeg** ([Download](https://ffmpeg.org/download.html))
- **pnpm** (install with `npm install -g pnpm`)

### Verify FFmpeg Installation

```bash
ffmpeg -version
```

## Installation

### Option 1: Automated Setup (Recommended)

```bash
# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

### Option 2: Manual Setup

**1. Install Frontend Dependencies**
```bash
cd frontend
pnpm install
cd ..
```

**2. Install Backend Dependencies**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

## Running the Application

### Terminal 1 - Start Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Start Frontend

```bash
cd frontend
pnpm run dev
```

You should see:
```
VITE v5.0.0  ready in XXX ms

➜  Local:   http://localhost:5173/
```

## First Test

1. Open http://localhost:5173 in your browser
2. Drag and drop a video file or click to upload
3. Wait for processing to complete
4. Try some AI commands:
   - "Speed up by 1.5x"
   - "Add fade in"
   - "Brighten by 0.2"
5. Download your edited video

## Test Videos

Create a short test video (10-30 seconds recommended):

**Using FFmpeg:**
```bash
# Create a simple test video with talking
ffmpeg -f lavfi -i testsrc=duration=15:size=1280x720:rate=30 \
  -f lavfi -i sine=f=1000:d=15 \
  -pix_fmt yuv420p test.mp4
```

## Troubleshooting

### FFmpeg not found
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Port already in use
```bash
# Change backend port
python -m uvicorn main:app --reload --port 8001

# Update frontend proxy in vite.config.ts
```

### Module not found errors
```bash
# Frontend
cd frontend && pnpm install

# Backend
cd backend && pip install -r requirements.txt
```

### Memory/CPU issues
- Reduce video resolution for testing
- Use shorter videos
- Close other applications

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [API.md](./API.md) for API reference
- Explore the [backend](./backend) and [frontend](./frontend) code
- Deploy to production (see README.md)

## Common Commands

### Frontend
```bash
pnpm run dev      # Start dev server
pnpm run build    # Build for production
pnpm run preview  # Preview production build
```

### Backend
```bash
# Development with auto-reload
python -m uvicorn main:app --reload

# Production
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# With custom workers
python -m uvicorn main:app --workers 4
```

## Getting Help

- Check logs in the terminal where the app is running
- Try a different, smaller video file
- Ensure all system dependencies are installed
- Review the [API Documentation](./API.md)

Enjoy using VoxCut!

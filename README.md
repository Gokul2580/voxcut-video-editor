# VoxCut - AI-Powered Video Editor

VoxCut is an intelligent video editing application designed for talking head content creators. It automatically detects takes, removes silence, stabilizes footage, and allows natural language editing commands.

## Project Structure

```
voxcut/
├── frontend/           # React + Vite frontend
│   ├── src/
│   │   ├── pages/     # Main application pages
│   │   ├── App.tsx    # Root component
│   │   ├── main.tsx   # Entry point
│   │   └── index.css  # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
└── backend/           # FastAPI backend
    ├── main.py        # FastAPI server
    ├── video_processor.py  # Video processing logic
    ├── job_manager.py      # Job management system
    └── pyproject.toml
```

## Features

### MVP (Phase 1)
- ✅ Video upload with drag-and-drop
- ✅ Real-time processing status tracking
- ✅ Before/after video preview
- ✅ Export with multiple quality options
- 🔄 Basic silence detection and removal
- 🔄 Multi-take detection
- 🔄 Video stabilization

### Full Feature Set (Phases 2-3)
- 🔄 Scene optimization and cutting
- 🔄 AI-powered editing commands
- 🔄 Multi-take comparison
- 🔄 Advanced audio processing
- 🔄 Frame-by-frame editing
- 🔄 Custom preset management

## Setup Instructions

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
pnpm install
```

2. Start development server:
```bash
pnpm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

1. Create virtual environment (recommended):
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
uv pip install -r requirements.txt
```

Or using uv directly:
```bash
uv init --bare .
uv add fastapi uvicorn python-multipart pydantic openai-whisper opencv-python numpy
```

3. Start the server:
```bash
uv run main.py
```

Or:
```bash
python -m uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## Required System Dependencies

- **FFmpeg**: For video processing
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt-get install ffmpeg`
  - Windows: Download from https://ffmpeg.org/download.html

- **Python 3.9+**: For backend
- **Node.js 18+**: For frontend

## API Endpoints

### Video Processing
- `POST /upload` - Upload a video file
- `GET /job/{job_id}` - Get job status and progress
- `POST /job/{job_id}/auto-edit` - Start auto-editing
- `POST /job/{job_id}/command` - Execute editing command
- `GET /download/{job_id}` - Download processed video

## Supported Video Formats

**Input**: MP4, MOV, WebM, MKV, AVI
**Output**: MP4, WebM, MOV

## Development Workflow

1. **Frontend Changes**: Changes automatically reload (HMR enabled)
2. **Backend Changes**: Server auto-reloads with `--reload` flag
3. **Video Processing**: Test with sample videos in `test_videos/` directory

## Configuration

### Environment Variables

**Frontend** (frontend/.env.local):
```
VITE_API_URL=http://localhost:8000
```

**Backend** (backend/.env):
```
UPLOAD_DIR=./uploads
PROCESSED_DIR=./processed
LOG_LEVEL=INFO
```

## Video Processing Pipeline

1. **Upload** - User uploads video file
2. **Analyze** - Extract metadata, detect audio tracks
3. **Process**:
   - Extract audio and analyze for speech
   - Detect scene changes and cuts
   - Identify best takes
   - Remove silence
   - Stabilize footage
4. **Render** - Assemble final video with all edits
5. **Export** - Make available for download

## Performance Optimizations

- Video processing happens in background tasks
- Chunked file uploads for large files
- Progress streaming to frontend
- Cached analysis results
- Multi-threaded FFmpeg operations

## Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed and in your PATH

### CORS errors
Check that frontend and backend ports match in vite.config.ts proxy config

### Video upload fails
- Check file format is supported
- Verify file is not corrupted
- Check disk space in uploads directory

## Production Deployment

### Frontend
```bash
pnpm run build
```
Deploy `dist/` folder to Vercel or static hosting

### Backend
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Deploy to cloud function service (AWS Lambda, Google Cloud Functions, etc.)

## Contributing

See CONTRIBUTING.md for guidelines

## License

MIT

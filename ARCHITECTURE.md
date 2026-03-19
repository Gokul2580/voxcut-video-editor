# VoxCut Architecture

## Overview

VoxCut is a modern full-stack application with a clear separation between frontend and backend:

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Frontend (React + Vite)                        │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ Pages (Upload, Processing, Preview)             │   │ │
│  │  │ Components (UI Elements)                        │   │ │
│  │  │ Hooks (API Communication)                       │   │ │
│  │  │ Utils (Formatting, Validation)                 │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (FastAPI + Python)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ API Routes (main.py)                                  │ │
│  │ ├─ /upload - Video upload                           │ │
│  │ ├─ /job/{id} - Job status                           │ │
│  │ ├─ /command - Execute edit command                  │ │
│  │ └─ /download - Download result                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Job Management (job_manager.py)                       │ │
│  │ ├─ Job creation and tracking                         │ │
│  │ ├─ Status updates and progress                       │ │
│  │ └─ Command history                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Video Processing (processing_tasks.py)                │ │
│  │ ├─ Async video analysis                              │ │
│  │ ├─ Scene detection (OpenCV)                          │ │
│  │ ├─ Speech detection (Whisper)                        │ │
│  │ ├─ Quality scoring                                   │ │
│  │ └─ Take selection                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Video Editor (video_editor.py)                        │ │
│  │ ├─ Segment management                                │ │
│  │ ├─ Filter application                                │ │
│  │ ├─ Speed/zoom/fade effects                           │ │
│  │ ├─ Color correction                                  │ │
│  │ ├─ Concatenation                                     │ │
│  │ └─ Command interpretation                            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Core Processing (video_processor.py)                  │ │
│  │ ├─ Video analysis (OpenCV)                           │ │
│  │ ├─ Audio extraction                                  │ │
│  │ ├─ Silence detection                                 │ │
│  │ ├─ Stabilization                                     │ │
│  │ └─ FFmpeg integration                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           File System & External Tools                      │
│  ├─ uploads/ - Original uploaded videos                    │
│  ├─ processed/ - Final processed videos                    │
│  ├─ FFmpeg - Video encoding/processing                     │
│  ├─ OpenCV - Frame analysis                                │
│  └─ Whisper - Speech-to-text analysis                      │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Directory Structure
```
frontend/
├── src/
│   ├── pages/
│   │   ├── UploadPage.tsx      # Video upload interface
│   │   ├── ProcessingPage.tsx   # Real-time processing status
│   │   └── PreviewPage.tsx      # Video preview & editing
│   ├── components/             # (Future: reusable UI components)
│   ├── hooks/
│   │   └── useApi.ts          # API communication hook
│   ├── utils/
│   │   └── format.ts          # String formatting utilities
│   ├── App.tsx                # Route management
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS config
├── postcss.config.js          # PostCSS config
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies
```

### State Management

Currently uses React hooks for local state:
- `useState` - Local component state
- `useRef` - DOM references
- `useCallback` - Memoized callbacks

**Future:** Consider Redux or Zustand for complex shared state.

### API Communication

The `useApi` hook provides:
- Automatic loading/error handling
- Request execution
- State management
- Cleanup

### Component Flow

```
App
├─ UploadPage (Drag-drop, validation)
│  └─ onUploadComplete → sets jobId
├─ ProcessingPage (Status polling)
│  └─ onComplete → moves to preview
└─ PreviewPage (Preview + editing)
   └─ onReset → back to upload
```

## Backend Architecture

### Job Lifecycle

```
1. Upload
   └─ Create job record
   └─ Save file
   └─ Start async processing

2. Analysis
   └─ Extract audio
   └─ Speech detection (Whisper)
   └─ Scene detection (OpenCV)
   └─ Quality scoring
   └─ Best take selection

3. Processing
   └─ Video stabilization
   └─ Silence removal
   └─ Apply commands

4. Rendering
   └─ FFmpeg assembly
   └─ Output encoding
   └─ Cleanup temp files

5. Complete
   └─ Store result
   └─ Ready for download
```

### Job Manager

Handles:
- Job creation and storage
- Status tracking
- Progress updates
- Command history
- File cleanup

### Video Processing Pipeline

**1. Audio Analysis (speech_detector.py)**
- Extract audio from video
- Detect speech segments using Whisper
- Normalize audio levels

**2. Video Analysis (video_processor.py)**
- Scene change detection via frame differences
- Quality scoring based on sharpness and stability
- Best take selection algorithm

**3. Video Editing (video_editor.py)**
- Command interpretation (natural language → effects)
- Segment management
- Filter application (speed, zoom, fade, color)
- Concatenation and assembly

**4. FFmpeg Integration**
- Video encoding
- Audio normalization
- Frame stabilization
- Format conversion

### Async Processing

Uses FastAPI's background tasks:
```python
@app.post("/upload")
async def upload_video(file: UploadFile, background_tasks: BackgroundTasks):
    # Save file
    # Create job
    # Queue background task
    background_tasks.add_task(process_video_async, job_id, file_path)
```

### Error Handling

- Try/except blocks catch exceptions
- Failed jobs marked with error status
- Temporary files cleaned up on failure
- User-friendly error messages

## Data Flow

### Upload Sequence
```
User Selects File
    ↓
[Frontend] Validation
    ↓
POST /upload
    ↓
[Backend] Save file
    ↓
Create job record
    ↓
Queue async processing
    ↓
Return job_id
    ↓
[Frontend] Poll /job/{id}
    ↓
Display progress
```

### Command Execution
```
[Frontend] User types command
    ↓
Parse natural language
    ↓
POST /command
    ↓
[Backend] CommandInterpreter
    ↓
Apply effects to video
    ↓
Update command history
    ↓
Return status
```

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool (fast HMR)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **FastAPI** - Web framework (async)
- **Uvicorn** - ASGI server
- **Python 3.11** - Language
- **OpenCV** - Video analysis
- **Whisper** - Speech detection
- **NumPy** - Numerical computing
- **FFmpeg** - Video processing

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Local development

## Performance Considerations

1. **Async Processing**
   - Long operations don't block API
   - Frontend polls status
   - Multiple jobs can process in parallel

2. **File Management**
   - Uploaded files stored separately from processing
   - Temporary files cleaned up
   - Output files optimized for size

3. **Video Analysis**
   - Sample frames (not every frame)
   - Cache results per job
   - Configurable quality/speed trade-off

4. **Frontend**
   - Server-side rendering not needed
   - Static file serving (Vite)
   - Progress tracking prevents timeouts

## Security Considerations

### Current (MVP)
- No authentication
- No rate limiting
- File validation (extension + type)
- Size limits (2GB max)

### Production Recommendations
- Add JWT authentication
- Implement rate limiting (Redis)
- Scan uploads for malware
- Validate file contents
- Use secure file paths
- Add HTTPS
- Implement CORS properly
- Add request signing
- Sanitize user inputs
- Add audit logging

## Scalability

### Current Limitations
- In-memory job storage (lost on restart)
- Single-process backend
- Local file storage

### Production Improvements
1. **Database**
   - PostgreSQL for job persistence
   - Redis for caching
   - S3 for file storage

2. **Distributed Processing**
   - Celery for task queue
   - Multiple worker processes
   - Load balancing

3. **Monitoring**
   - Health checks
   - Error tracking (Sentry)
   - Performance monitoring
   - Logging to centralized service

## Testing Strategy

### Frontend Tests
- Unit tests (Jest)
- Component tests (React Testing Library)
- E2E tests (Playwright/Cypress)

### Backend Tests
- Unit tests (pytest)
- Integration tests
- Load testing

## Future Enhancements

1. **AI Features**
   - Multi-take auto-selection
   - Intelligent silence removal
   - Scene optimization
   - Automatic captions

2. **Collaboration**
   - User accounts
   - Project sharing
   - Version control

3. **Advanced Editing**
   - Timeline interface
   - Frame-by-frame editing
   - Custom presets
   - Template system

4. **Performance**
   - GPU acceleration
   - Caching strategies
   - CDN integration
   - Progressive uploads/downloads

## Deployment

See [README.md](./README.md) for deployment instructions.

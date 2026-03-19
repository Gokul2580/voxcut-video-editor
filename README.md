# VoxCut - AI-Powered Video Editor

**Team: BuildNBrew**

## The Problem

Content creators, especially those producing talking head videos, spend countless hours on repetitive editing tasks: removing awkward silences, selecting the best takes, and cleaning up footage. This manual process is time-consuming, tedious, and creates a significant barrier for creators who want to produce quality content consistently.

## Our Solution

VoxCut is an intelligent video editing application that automates the most tedious parts of video editing. By leveraging AI-powered analysis, VoxCut can:

- **Automatically detect and remove silences** - No more scrubbing through footage to cut dead air
- **Identify multiple takes** - Smart detection helps you quickly compare and select the best performance
- **Stabilize footage** - Smooth out shaky camera work without manual keyframing
- **Natural language editing** - Simply describe what you want, and VoxCut does the rest

## Impact

- **Save 70%+ editing time** - Tasks that took hours now take minutes
- **Lower the barrier to content creation** - Creators can focus on their message, not the tools
- **Consistent quality output** - Automated processing ensures professional results every time
- **Scalable content production** - Create more content without hiring editors

## Features

- Drag-and-drop video upload
- Real-time processing status tracking
- Before/after video preview comparison
- Multiple export quality options (720p, 1080p, 4K)
- Timeline visualization with detected segments
- One-click silence removal
- Take comparison and selection

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Video Processing**: FFmpeg, Web APIs

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start development server:
```bash
pnpm run dev
```

The application will be available at `http://localhost:3000`

## Supported Video Formats

**Input**: MP4, MOV, WebM, MKV, AVI  
**Output**: MP4, WebM, MOV

## License

MIT

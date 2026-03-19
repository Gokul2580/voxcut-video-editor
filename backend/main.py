from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import os
import json
import uuid
from pathlib import Path
import asyncio
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime

from job_manager import job_manager, JobStatus
from processing_tasks import (
    process_video_async,
    remove_silence_async,
    stabilize_video_async,
    denoise_audio_async,
    generate_captions_async,
    detect_scenes_async,
    auto_color_correct_async,
    auto_clip_async,
    extract_highlights_async,
    apply_effect_async,
    cut_video_async,
    change_speed_async,
    add_text_overlay_async,
    apply_transition_async,
    merge_clips_async,
    auto_enhance_async
)

# Create directories
UPLOAD_DIR = Path("./uploads")
OUTPUT_DIR = Path("./outputs")
CLIPS_DIR = Path("./clips")
CAPTIONS_DIR = Path("./captions")

for dir_path in [UPLOAD_DIR, OUTPUT_DIR, CLIPS_DIR, CAPTIONS_DIR]:
    dir_path.mkdir(exist_ok=True)

app = FastAPI(title="VoxCut AI Video Editor API", version="3.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)

    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)

    async def broadcast(self, job_id: str, message: dict):
        if job_id in self.active_connections:
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()


# Request models
class CommandRequest(BaseModel):
    command: str
    params: dict = {}


class ProcessingOptions(BaseModel):
    remove_silence: bool = False
    stabilize: bool = False
    denoise: bool = False
    auto_captions: bool = False
    color_correct: bool = False
    auto_clip: bool = False


class CutRequest(BaseModel):
    start_time: float
    end_time: float


class SpeedRequest(BaseModel):
    speed: float = 1.0


class TextOverlayRequest(BaseModel):
    text: str
    start_time: float
    end_time: float
    position: str = "center"
    font_size: int = 48
    color: str = "#ffffff"
    font: str = "Arial"
    animation: str = "none"


class EffectRequest(BaseModel):
    effect_type: str
    params: dict = {}


class TransitionRequest(BaseModel):
    transition_type: str
    duration: float = 1.0


class ClipMergeRequest(BaseModel):
    clip_ids: List[str]
    transitions: List[str] = []


class CaptionRequest(BaseModel):
    captions: List[dict]


@app.get("/")
async def root():
    return {
        "message": "VoxCut AI Video Editor API", 
        "version": "3.0.0", 
        "status": "running",
        "features": [
            "video_upload", "ai_processing", "voice_commands", 
            "auto_clip", "highlight_detection", "captions",
            "text_overlays", "transitions", "effects", "export"
        ]
    }


@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None
):
    """Upload a video file and create a job"""
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Supported: MP4, WebM, MOV, AVI, MPEG")
    
    job_id = str(uuid.uuid4())
    
    file_extension = Path(file.filename).suffix or ".mp4"
    upload_path = UPLOAD_DIR / f"{job_id}_original{file_extension}"
    
    contents = await file.read()
    with open(upload_path, "wb") as f:
        f.write(contents)
    
    job = job_manager.create_job(job_id, str(upload_path))
    job_manager.update_progress(job_id, 100, JobStatus.READY)
    
    # Get video metadata
    metadata = get_video_metadata(str(upload_path))
    
    return {
        "job_id": job_id, 
        "status": "ready",
        "file_name": file.filename,
        "file_size": len(contents),
        "metadata": metadata
    }


def get_video_metadata(video_path: str) -> dict:
    """Get video metadata using ffprobe"""
    import subprocess
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', '-show_streams', video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(result.stdout)
        
        video_stream = next((s for s in data.get('streams', []) if s['codec_type'] == 'video'), {})
        audio_stream = next((s for s in data.get('streams', []) if s['codec_type'] == 'audio'), {})
        
        return {
            "duration": float(data.get('format', {}).get('duration', 0)),
            "width": video_stream.get('width', 0),
            "height": video_stream.get('height', 0),
            "fps": eval(video_stream.get('r_frame_rate', '30/1')),
            "codec": video_stream.get('codec_name', 'unknown'),
            "audio_codec": audio_stream.get('codec_name', 'none'),
            "bitrate": int(data.get('format', {}).get('bit_rate', 0))
        }
    except:
        return {"duration": 0, "width": 0, "height": 0, "fps": 30}


# WebSocket endpoint for real-time updates
@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await manager.connect(websocket, job_id)
    try:
        while True:
            # Send current job status
            job_dict = job_manager.get_job_dict(job_id)
            if job_dict:
                await websocket.send_json({
                    "type": "status",
                    "data": job_dict
                })
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)


@app.get("/stream/{job_id}")
async def stream_video(job_id: str):
    """Stream original video file with range support"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = Path(job.original_file)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    file_size = video_path.stat().st_size
    ext = video_path.suffix.lower()
    content_type = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo'
    }.get(ext, 'video/mp4')
    
    return FileResponse(
        video_path,
        media_type=content_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        }
    )


@app.get("/stream/{job_id}/processed")
async def stream_processed_video(job_id: str):
    """Stream processed video file"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.processed_file:
        video_path = Path(job.processed_file)
    else:
        video_path = Path(job.original_file)
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    file_size = video_path.stat().st_size
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        }
    )


@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get job status and progress"""
    job_dict = job_manager.get_job_dict(job_id)
    if not job_dict:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_dict


# ============================================
# AI Processing Endpoints
# ============================================

@app.post("/process/remove-silence/{job_id}")
async def remove_silence(job_id: str, background_tasks: BackgroundTasks):
    """Remove silent parts from video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(remove_silence_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "remove_silence", "job_id": job_id}


@app.post("/process/stabilize/{job_id}")
async def stabilize_video(job_id: str, background_tasks: BackgroundTasks):
    """Stabilize shaky video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(stabilize_video_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "stabilize", "job_id": job_id}


@app.post("/process/denoise/{job_id}")
async def denoise_audio(job_id: str, background_tasks: BackgroundTasks):
    """Remove background noise from audio"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(denoise_audio_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "denoise", "job_id": job_id}


@app.post("/process/captions/{job_id}")
async def generate_captions(job_id: str, background_tasks: BackgroundTasks):
    """Generate auto captions using AI"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(generate_captions_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "captions", "job_id": job_id}


@app.post("/process/scene-detect/{job_id}")
async def detect_scenes(job_id: str, background_tasks: BackgroundTasks):
    """Detect scene changes in video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(detect_scenes_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "scene_detect", "job_id": job_id}


@app.post("/process/color-correct/{job_id}")
async def color_correct(job_id: str, background_tasks: BackgroundTasks):
    """Auto color correct video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(auto_color_correct_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "color_correct", "job_id": job_id}


@app.post("/process/auto-clip/{job_id}")
async def auto_clip(job_id: str, background_tasks: BackgroundTasks):
    """Automatically detect and extract highlight clips using AI"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(auto_clip_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "auto_clip", "job_id": job_id}


@app.post("/process/highlights/{job_id}")
async def extract_highlights(job_id: str, background_tasks: BackgroundTasks):
    """Extract highlight moments from video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(extract_highlights_async, job_id, job.original_file, manager)
    
    return {"status": "processing", "operation": "highlights", "job_id": job_id}


class AutoEnhanceRequest(BaseModel):
    remove_silence: bool = True
    stabilize: bool = True
    denoise: bool = True
    color_correct: bool = True


@app.post("/process/auto-enhance/{job_id}")
async def auto_enhance(job_id: str, request: AutoEnhanceRequest = None, background_tasks: BackgroundTasks = None):
    """Apply multiple AI enhancements in sequence"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if request is None:
        request = AutoEnhanceRequest()
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(
        auto_enhance_async, job_id, job.original_file, 
        request.remove_silence, request.stabilize, request.denoise, request.color_correct, 
        manager
    )
    
    return {"status": "processing", "operation": "auto_enhance", "job_id": job_id}


# ============================================
# Video Editing Endpoints
# ============================================

@app.post("/edit/cut/{job_id}")
async def cut_video(job_id: str, request: CutRequest, background_tasks: BackgroundTasks):
    """Cut video segment"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = job.processed_file or job.original_file
    background_tasks.add_task(
        cut_video_async, job_id, video_path, 
        request.start_time, request.end_time, manager
    )
    
    return {"status": "processing", "operation": "cut", "job_id": job_id}


@app.post("/edit/speed/{job_id}")
async def change_speed(job_id: str, request: SpeedRequest, background_tasks: BackgroundTasks):
    """Change video playback speed"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = job.processed_file or job.original_file
    background_tasks.add_task(
        change_speed_async, job_id, video_path, request.speed, manager
    )
    
    return {"status": "processing", "operation": "speed", "job_id": job_id}


@app.post("/edit/text/{job_id}")
async def add_text_overlay(job_id: str, request: TextOverlayRequest, background_tasks: BackgroundTasks):
    """Add text overlay to video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = job.processed_file or job.original_file
    background_tasks.add_task(
        add_text_overlay_async, job_id, video_path, request.dict(), manager
    )
    
    return {"status": "processing", "operation": "text_overlay", "job_id": job_id}


@app.post("/edit/effect/{job_id}")
async def apply_effect(job_id: str, request: EffectRequest, background_tasks: BackgroundTasks):
    """Apply visual effect to video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = job.processed_file or job.original_file
    background_tasks.add_task(
        apply_effect_async, job_id, video_path, 
        request.effect_type, request.params, manager
    )
    
    return {"status": "processing", "operation": "effect", "job_id": job_id}


@app.post("/edit/transition/{job_id}")
async def apply_transition(job_id: str, request: TransitionRequest, background_tasks: BackgroundTasks):
    """Apply transition effect"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = job.processed_file or job.original_file
    background_tasks.add_task(
        apply_transition_async, job_id, video_path,
        request.transition_type, request.duration, manager
    )
    
    return {"status": "processing", "operation": "transition", "job_id": job_id}


# ============================================
# Captions and Subtitles
# ============================================

@app.get("/captions/{job_id}")
async def get_captions(job_id: str):
    """Get captions for a video"""
    srt_path = CAPTIONS_DIR / f"{job_id}_captions.srt"
    json_path = CAPTIONS_DIR / f"{job_id}_captions.json"
    
    if json_path.exists():
        with open(json_path, 'r') as f:
            return {"captions": json.load(f)}
    
    if srt_path.exists():
        captions = parse_srt_file(str(srt_path))
        return {"captions": captions}
    
    return {"captions": []}


@app.post("/captions/{job_id}")
async def save_captions(job_id: str, request: CaptionRequest):
    """Save edited captions"""
    json_path = CAPTIONS_DIR / f"{job_id}_captions.json"
    srt_path = CAPTIONS_DIR / f"{job_id}_captions.srt"
    
    # Save JSON
    with open(json_path, 'w') as f:
        json.dump(request.captions, f, indent=2)
    
    # Save SRT
    write_srt_file(request.captions, str(srt_path))
    
    return {"status": "saved", "count": len(request.captions)}


@app.post("/captions/{job_id}/burn")
async def burn_captions(job_id: str, background_tasks: BackgroundTasks):
    """Burn captions into video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    srt_path = CAPTIONS_DIR / f"{job_id}_captions.srt"
    if not srt_path.exists():
        raise HTTPException(status_code=404, detail="No captions found")
    
    video_path = job.processed_file or job.original_file
    output_path = str(OUTPUT_DIR / f"{job_id}_captioned.mp4")
    
    background_tasks.add_task(
        burn_captions_async, job_id, video_path, str(srt_path), output_path, manager
    )
    
    return {"status": "processing", "operation": "burn_captions", "job_id": job_id}


async def burn_captions_async(job_id: str, video_path: str, srt_path: str, output_path: str, manager):
    """Burn subtitles into video using FFmpeg"""
    import subprocess
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await manager.broadcast(job_id, {"type": "progress", "progress": 10, "status": "Burning captions"})
        
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', f"subtitles={srt_path}:force_style='FontSize=24,PrimaryColour=&HFFFFFF&'",
            '-c:a', 'copy',
            '-y', output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        job_manager.complete_job(job_id, output_path, {"operation": "burn_captions"})
        await manager.broadcast(job_id, {"type": "complete", "output": output_path})
        
    except Exception as e:
        job_manager.fail_job(job_id, str(e))
        await manager.broadcast(job_id, {"type": "error", "error": str(e)})


def parse_srt_file(srt_path: str) -> List[dict]:
    """Parse SRT file into list of captions"""
    captions = []
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    blocks = content.strip().split('\n\n')
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            times = lines[1].split(' --> ')
            captions.append({
                'id': int(lines[0]),
                'start': srt_time_to_seconds(times[0]),
                'end': srt_time_to_seconds(times[1]),
                'text': ' '.join(lines[2:])
            })
    
    return captions


def srt_time_to_seconds(time_str: str) -> float:
    """Convert SRT time format to seconds"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])


def write_srt_file(captions: List[dict], output_path: str):
    """Write captions to SRT file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, cap in enumerate(captions, 1):
            start = format_srt_time(cap.get('start', 0))
            end = format_srt_time(cap.get('end', 0))
            text = cap.get('text', '')
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")


def format_srt_time(seconds: float) -> str:
    """Format seconds to SRT time format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


# ============================================
# Voice Command Processing
# ============================================

@app.post("/job/{job_id}/command")
async def execute_command(job_id: str, data: CommandRequest, background_tasks: BackgroundTasks):
    """Execute a voice/text command on the video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    command = data.command.lower()
    params = data.params
    video_path = job.processed_file or job.original_file
    
    result = {"status": "executed", "command": command, "job_id": job_id}
    
    # Parse and execute command
    if any(x in command for x in ["remove silence", "cut silence", "delete silence"]):
        background_tasks.add_task(remove_silence_async, job_id, video_path, manager)
        result["action"] = "remove_silence"
        
    elif any(x in command for x in ["speed up", "faster"]):
        speed = params.get("speed", 1.5)
        background_tasks.add_task(change_speed_async, job_id, video_path, speed, manager)
        result["action"] = "speed_up"
        result["speed"] = speed
        
    elif any(x in command for x in ["slow down", "slower"]):
        speed = params.get("speed", 0.5)
        background_tasks.add_task(change_speed_async, job_id, video_path, speed, manager)
        result["action"] = "slow_down"
        result["speed"] = speed
        
    elif "stabilize" in command:
        background_tasks.add_task(stabilize_video_async, job_id, video_path, manager)
        result["action"] = "stabilize"
        
    elif any(x in command for x in ["denoise", "remove noise", "clean audio"]):
        background_tasks.add_task(denoise_audio_async, job_id, video_path, manager)
        result["action"] = "denoise"
        
    elif any(x in command for x in ["caption", "subtitle", "transcribe"]):
        background_tasks.add_task(generate_captions_async, job_id, video_path, manager)
        result["action"] = "captions"
        
    elif any(x in command for x in ["auto clip", "highlight", "best moments"]):
        background_tasks.add_task(auto_clip_async, job_id, video_path, manager)
        result["action"] = "auto_clip"
        
    elif any(x in command for x in ["color correct", "enhance color", "fix colors"]):
        background_tasks.add_task(auto_color_correct_async, job_id, video_path, manager)
        result["action"] = "color_correct"
        
    elif any(x in command for x in ["detect scene", "find scenes", "scene change"]):
        background_tasks.add_task(detect_scenes_async, job_id, video_path, manager)
        result["action"] = "scene_detect"
        
    elif "cut" in command:
        start = params.get("start", 0)
        end = params.get("end", 10)
        background_tasks.add_task(cut_video_async, job_id, video_path, start, end, manager)
        result["action"] = "cut"
        result["start"] = start
        result["end"] = end
        
    elif any(x in command for x in ["add text", "text overlay", "title"]):
        text = params.get("text", "Title")
        text_params = {
            "text": text,
            "start_time": params.get("start", 0),
            "end_time": params.get("end", 5),
            "position": params.get("position", "center"),
            "font_size": params.get("font_size", 48),
            "color": params.get("color", "#ffffff")
        }
        background_tasks.add_task(add_text_overlay_async, job_id, video_path, text_params, manager)
        result["action"] = "text_overlay"
        
    elif any(x in command for x in ["fade in", "fade out", "transition"]):
        trans_type = "fadein" if "fade in" in command else "fadeout"
        duration = params.get("duration", 1.0)
        background_tasks.add_task(apply_transition_async, job_id, video_path, trans_type, duration, manager)
        result["action"] = "transition"
        result["type"] = trans_type
        
    else:
        result["status"] = "unknown_command"
        result["message"] = "Command not recognized"
    
    job_manager.add_command(job_id, command, params)
    
    return result


# ============================================
# Export and Download
# ============================================

@app.get("/download/{job_id}")
async def download_video(job_id: str):
    """Download the processed video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = Path(job.processed_file) if job.processed_file else Path(job.original_file)
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        video_path, 
        media_type="video/mp4",
        filename=f"voxcut_export_{job_id[:8]}.mp4"
    )


@app.get("/clips/{job_id}")
async def get_clips(job_id: str):
    """Get all clips for a job"""
    clips = []
    clip_dir = CLIPS_DIR / job_id
    
    if clip_dir.exists():
        for clip_file in clip_dir.glob("*.mp4"):
            clips.append({
                "id": clip_file.stem,
                "path": str(clip_file),
                "name": clip_file.name
            })
    
    return {"clips": clips}


@app.get("/jobs")
async def list_jobs():
    """List all jobs"""
    return {"jobs": job_manager.list_jobs()}


@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and clean up its files"""
    job_manager.cleanup_job(job_id)
    return {"status": "deleted", "job_id": job_id}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

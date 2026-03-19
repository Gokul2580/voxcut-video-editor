from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import os
import json
import uuid
from pathlib import Path
import asyncio
from typing import Optional
from pydantic import BaseModel

from job_manager import job_manager, JobStatus
from processing_tasks import (
    process_video_async,
    remove_silence_async,
    stabilize_video_async,
    denoise_audio_async,
    generate_captions_async,
    detect_scenes_async,
    auto_color_correct_async
)

# Create directories
UPLOAD_DIR = Path("./uploads")
OUTPUT_DIR = Path("./outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="VoxCut API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/")
async def root():
    return {"message": "VoxCut API", "version": "2.0.0", "status": "running"}


@app.post("/upload")
async def upload_video(
    file: UploadFile = File(...), 
    background_tasks: BackgroundTasks = None
):
    """Upload a video file and create a job"""
    # Validate file type
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Supported: MP4, WebM, MOV, AVI")
    
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    file_extension = Path(file.filename).suffix or ".mp4"
    upload_path = UPLOAD_DIR / f"{job_id}_original{file_extension}"
    
    contents = await file.read()
    with open(upload_path, "wb") as f:
        f.write(contents)
    
    # Create job record
    job = job_manager.create_job(job_id, str(upload_path))
    job_manager.update_progress(job_id, 100, JobStatus.READY)
    
    return {
        "job_id": job_id, 
        "status": "ready",
        "file_name": file.filename,
        "file_size": len(contents)
    }


@app.get("/stream/{job_id}")
async def stream_video(job_id: str):
    """Stream original video file"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_path = Path(job.original_file)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    def iterfile():
        with open(video_path, mode="rb") as file:
            yield from file
    
    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f"inline; filename={video_path.name}"
        }
    )


@app.get("/stream/{job_id}/processed")
async def stream_processed_video(job_id: str):
    """Stream processed video file"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.processed_file:
        raise HTTPException(status_code=400, detail="Video not yet processed")
    
    video_path = Path(job.processed_file)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Processed video file not found")
    
    def iterfile():
        with open(video_path, mode="rb") as file:
            yield from file
    
    return StreamingResponse(iterfile(), media_type="video/mp4")


@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get job status and progress"""
    job_dict = job_manager.get_job_dict(job_id)
    if not job_dict:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job_dict


# AI Processing Endpoints
@app.post("/process/remove-silence/{job_id}")
async def remove_silence(job_id: str, background_tasks: BackgroundTasks):
    """Remove silent parts from video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(remove_silence_async, job_id, job.original_file)
    
    return {"status": "processing", "operation": "remove_silence", "job_id": job_id}


@app.post("/process/stabilize/{job_id}")
async def stabilize_video(job_id: str, background_tasks: BackgroundTasks):
    """Stabilize shaky video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(stabilize_video_async, job_id, job.original_file)
    
    return {"status": "processing", "operation": "stabilize", "job_id": job_id}


@app.post("/process/denoise/{job_id}")
async def denoise_audio(job_id: str, background_tasks: BackgroundTasks):
    """Remove background noise from audio"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(denoise_audio_async, job_id, job.original_file)
    
    return {"status": "processing", "operation": "denoise", "job_id": job_id}


@app.post("/process/captions/{job_id}")
async def generate_captions(job_id: str, background_tasks: BackgroundTasks):
    """Generate auto captions using AI"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(generate_captions_async, job_id, job.original_file)
    
    return {"status": "processing", "operation": "captions", "job_id": job_id}


@app.post("/process/scene-detect/{job_id}")
async def detect_scenes(job_id: str, background_tasks: BackgroundTasks):
    """Detect scene changes in video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(detect_scenes_async, job_id, job.original_file)
    
    return {"status": "processing", "operation": "scene_detect", "job_id": job_id}


@app.post("/process/color-correct/{job_id}")
async def color_correct(job_id: str, background_tasks: BackgroundTasks):
    """Auto color correct video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    background_tasks.add_task(auto_color_correct_async, job_id, job.original_file)
    
    return {"status": "processing", "operation": "color_correct", "job_id": job_id}


@app.post("/process/auto-enhance/{job_id}")
async def auto_enhance(job_id: str, options: ProcessingOptions, background_tasks: BackgroundTasks):
    """Run multiple AI enhancements"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_manager.update_progress(job_id, 0, JobStatus.PROCESSING)
    
    # Queue all selected operations
    if options.remove_silence:
        background_tasks.add_task(remove_silence_async, job_id, job.original_file)
    if options.stabilize:
        background_tasks.add_task(stabilize_video_async, job_id, job.original_file)
    if options.denoise:
        background_tasks.add_task(denoise_audio_async, job_id, job.original_file)
    if options.auto_captions:
        background_tasks.add_task(generate_captions_async, job_id, job.original_file)
    if options.color_correct:
        background_tasks.add_task(auto_color_correct_async, job_id, job.original_file)
    
    return {"status": "processing", "operation": "auto_enhance", "job_id": job_id}


@app.post("/job/{job_id}/command")
async def execute_command(job_id: str, data: CommandRequest):
    """Execute a voice/text command on the video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    command = data.command.lower()
    params = data.params
    
    # Parse command and execute
    result = {"status": "executed", "command": command, "job_id": job_id}
    
    if "remove silence" in command:
        result["action"] = "remove_silence"
    elif "speed up" in command:
        result["action"] = "speed_change"
        result["speed"] = params.get("speed", 1.5)
    elif "slow down" in command:
        result["action"] = "speed_change"
        result["speed"] = params.get("speed", 0.5)
    elif "stabilize" in command:
        result["action"] = "stabilize"
    elif "denoise" in command or "remove noise" in command:
        result["action"] = "denoise"
    elif "caption" in command or "subtitle" in command:
        result["action"] = "captions"
    elif "cut" in command:
        result["action"] = "cut"
        result["start"] = params.get("start", 0)
        result["end"] = params.get("end", 0)
    
    job_manager.add_command(job_id, command, params)
    
    return result


@app.get("/download/{job_id}")
async def download_video(job_id: str):
    """Download the processed video"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Return processed file if available, otherwise original
    video_path = Path(job.processed_file) if job.processed_file else Path(job.original_file)
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        video_path, 
        media_type="video/mp4",
        filename=f"voxcut_export_{job_id[:8]}.mp4"
    )


@app.get("/jobs")
async def list_jobs():
    """List all jobs"""
    return {"jobs": job_manager.list_jobs()}


@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and clean up its files"""
    job_manager.cleanup_job(job_id)
    return {"status": "deleted", "job_id": job_id}


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

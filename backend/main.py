from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import json
import uuid
from pathlib import Path
import asyncio
from typing import Optional

from job_manager import job_manager, JobStatus
from processing_tasks import process_video_async

# Create uploads directory
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="VoxCut API", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "VoxCut API", "version": "0.1.0"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    """Upload a video file and start processing"""
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    upload_path = UPLOAD_DIR / f"{job_id}_original.mp4"
    contents = await file.read()
    with open(upload_path, "wb") as f:
        f.write(contents)
    
    # Create job record
    job = job_manager.create_job(job_id, str(upload_path))
    job_manager.update_progress(job_id, 5, JobStatus.QUEUED)
    
    # Start async processing
    if background_tasks:
        background_tasks.add_task(process_video_async, job_id, str(upload_path))
    else:
        # Fallback: create task manually if no background_tasks
        asyncio.create_task(process_video_async(job_id, str(upload_path)))
    
    return {"job_id": job_id, "status": "uploading"}


@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Get job status and progress"""
    job_dict = job_manager.get_job_dict(job_id)
    if not job_dict:
        return {"error": "Job not found"}, 404
    
    return job_dict


@app.post("/job/{job_id}/auto-edit")
async def auto_edit_video(job_id: str):
    """Start auto-editing the video"""
    job = job_manager.get_job(job_id)
    if not job:
        return {"error": "Job not found"}, 404
    
    # Processing already started on upload
    return {"status": "processing", "job_id": job_id}


@app.post("/job/{job_id}/command")
async def execute_command(job_id: str, data: dict):
    """Execute a command on the video"""
    job = job_manager.get_job(job_id)
    if not job:
        return {"error": "Job not found"}, 404
    
    command = data.get("command", "")
    params = data.get("params", {})
    
    # Record the command
    job_manager.add_command(job_id, command, params)
    
    # TODO: Implement command execution
    return {"status": "command_executed", "command": command, "job_id": job_id}


@app.get("/download/{job_id}")
async def download_video(job_id: str):
    """Download the processed video"""
    job = job_manager.get_job(job_id)
    if not job:
        return {"error": "Job not found"}, 404
    
    if not job.processed_file:
        return {"error": "Video not ready"}, 400
    
    processed_path = Path(job.processed_file)
    if not processed_path.exists():
        return {"error": "Video file not found"}, 404
    
    return FileResponse(processed_path, media_type="video/mp4")

@app.get("/jobs")
async def list_jobs():
    """List all jobs"""
    return {"jobs": job_manager.list_jobs()}


@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and clean up its files"""
    job_manager.cleanup_job(job_id)
    return {"status": "deleted", "job_id": job_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

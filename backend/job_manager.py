"""
Job management system for VoxCut
Handles video processing jobs, progress tracking, and state management
"""
from typing import Dict, Optional
from pathlib import Path
from datetime import datetime
import json
import asyncio
from enum import Enum


class JobStatus(str, Enum):
    UPLOADING = "uploading"
    READY = "ready"
    QUEUED = "queued"
    ANALYZING = "analyzing"
    PROCESSING = "processing"
    EDITING = "editing"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"


class Job:
    def __init__(self, job_id: str, original_file: str):
        self.id = job_id
        self.original_file = original_file
        self.status = JobStatus.UPLOADING
        self.progress = 0
        self.created_at = datetime.now().isoformat()
        self.completed_at: Optional[str] = None
        self.processed_file: Optional[str] = None
        self.error: Optional[str] = None
        self.metadata = {}
        self.commands_history = []

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status.value,
            "progress": self.progress,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "original_file": self.original_file,
            "processed_file": self.processed_file,
            "error": self.error,
            "metadata": self.metadata,
            "commands_history": self.commands_history,
        }


class JobManager:
    """Manages video processing jobs"""

    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self.upload_dir = Path("./uploads")
        self.upload_dir.mkdir(exist_ok=True)

    def create_job(self, job_id: str, original_file: str) -> Job:
        """Create a new job"""
        job = Job(job_id, original_file)
        self.jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID"""
        return self.jobs.get(job_id)

    def update_progress(self, job_id: str, progress: int, status: JobStatus):
        """Update job progress"""
        job = self.get_job(job_id)
        if job:
            job.progress = min(100, max(0, progress))
            job.status = status

    def complete_job(self, job_id: str, processed_file: str, metadata: Dict = None):
        """Mark job as completed"""
        job = self.get_job(job_id)
        if job:
            job.processed_file = processed_file
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.completed_at = datetime.now().isoformat()
            if metadata:
                job.metadata = metadata

    def fail_job(self, job_id: str, error: str):
        """Mark job as failed"""
        job = self.get_job(job_id)
        if job:
            job.status = JobStatus.FAILED
            job.error = error
            job.completed_at = datetime.now().isoformat()

    def add_command(self, job_id: str, command: str, params: Dict = None):
        """Record a command executed on the job"""
        job = self.get_job(job_id)
        if job:
            job.commands_history.append({
                "timestamp": datetime.now().isoformat(),
                "command": command,
                "params": params or {},
            })

    def get_job_dict(self, job_id: str) -> Optional[Dict]:
        """Get job as dictionary"""
        job = self.get_job(job_id)
        if job:
            return job.to_dict()
        return None

    def list_jobs(self) -> list:
        """List all jobs"""
        return [job.to_dict() for job in self.jobs.values()]

    def cleanup_job(self, job_id: str):
        """Clean up job files"""
        job = self.get_job(job_id)
        if job:
            # Remove files
            original_path = Path(job.original_file)
            if original_path.exists():
                original_path.unlink()

            if job.processed_file:
                processed_path = Path(job.processed_file)
                if processed_path.exists():
                    processed_path.unlink()

            # Remove from jobs dict
            del self.jobs[job_id]


# Global job manager instance
job_manager = JobManager()

"""
Async processing tasks for VoxCut
Handles long-running video processing operations in background
"""
import asyncio
import subprocess
from pathlib import Path
from typing import Tuple, List, Dict, Optional
from video_processor import VideoProcessor, AudioAnalyzer
from job_manager import job_manager, JobStatus
import json
import numpy as np
import cv2
import os

# Optional: Use OpenAI API for speech detection (more Windows-compatible)
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


async def process_video_async(job_id: str, video_path: str) -> bool:
    """
    Main video processing pipeline
    Returns True if successful, False if failed
    """
    try:
        job = job_manager.get_job(job_id)
        if not job:
            return False

        # Step 1: Extract and analyze audio
        job_manager.update_progress(job_id, 10, JobStatus.ANALYZING)
        audio_path = Path(f"./uploads/{job_id}_audio.wav")
        
        try:
            AudioAnalyzer.extract_audio(video_path, str(audio_path))
        except Exception as e:
            print(f"Audio extraction failed: {e}")
            audio_path = None

        # Step 2: Detect speech using Whisper
        job_manager.update_progress(job_id, 20, JobStatus.ANALYZING)
        speech_segments = []
        if audio_path and audio_path.exists():
            try:
                speech_segments = await detect_speech_whisper(str(audio_path))
            except Exception as e:
                print(f"Speech detection failed: {e}")

        # Step 3: Detect scene changes
        job_manager.update_progress(job_id, 40, JobStatus.PROCESSING)
        processor = VideoProcessor(video_path)
        scene_changes = processor.detect_scene_changes(threshold=25.0)
        
        # Step 4: Detect best take
        job_manager.update_progress(job_id, 50, JobStatus.PROCESSING)
        best_take = detect_best_take(processor, scene_changes)

        # Step 5: Stabilize video
        job_manager.update_progress(job_id, 70, JobStatus.RENDERING)
        stabilized_path = Path(f"./uploads/{job_id}_stabilized.mp4")
        processor.stabilize_video(str(stabilized_path))
        
        # Step 6: Remove silence if audio available
        if audio_path and audio_path.exists():
            job_manager.update_progress(job_id, 80, JobStatus.RENDERING)
            no_silence_path = Path(f"./uploads/{job_id}_no_silence.mp4")
            AudioAnalyzer.normalize_audio(str(audio_path), str(no_silence_path))
        else:
            no_silence_path = stabilized_path

        # Step 7: Final assembly
        job_manager.update_progress(job_id, 90, JobStatus.RENDERING)
        output_path = Path(f"./uploads/{job_id}_processed.mp4")
        assemble_final_video(str(stabilized_path), str(output_path))

        # Step 8: Complete job
        processor.close()
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        
        metadata = {
            "original_duration": processor.get_metadata()['duration'],
            "fps": processor.get_metadata()['fps'],
            "scene_changes": len(scene_changes),
            "speech_segments": len(speech_segments),
            "best_take": best_take,
        }
        
        job_manager.complete_job(job_id, str(output_path), metadata)
        
        # Cleanup
        cleanup_temp_files(job_id)
        
        return True

    except Exception as e:
        print(f"Video processing failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


async def detect_speech_whisper(audio_path: str) -> List[Tuple[float, float]]:
    """
    Detect speech segments using OpenAI Whisper API
    Returns list of (start_time, end_time) tuples
    Falls back to basic detection if API is unavailable
    """
    # Try OpenAI API first (more Windows-compatible)
    if OPENAI_AVAILABLE:
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                client = OpenAI(api_key=api_key)
                
                with open(audio_path, "rb") as audio_file:
                    result = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json",
                        timestamp_granularities=["segment"]
                    )
                
                # Extract speech segments from result
                speech_segments = []
                if hasattr(result, 'segments') and result.segments:
                    for segment in result.segments:
                        start = segment.get("start", segment.start if hasattr(segment, 'start') else 0)
                        end = segment.get("end", segment.end if hasattr(segment, 'end') else 0)
                        speech_segments.append((start, end))
                
                return speech_segments
        except Exception as e:
            print(f"OpenAI Whisper API failed: {e}")
    
    # Fallback: Return empty list (skip speech detection)
    print("Speech detection unavailable - skipping")
    return []


def detect_best_take(processor: VideoProcessor, scene_changes: List[int]) -> Dict:
    """
    Analyze video to find the best take
    Uses scene detection and video quality metrics
    """
    # For MVP, find the longest continuous section between scene changes
    if not scene_changes:
        return {
            "start_frame": 0,
            "end_frame": processor.frame_count,
            "duration": processor.frame_count / processor.fps,
            "quality_score": 0.8,
        }

    takes = []
    prev_change = 0
    
    for change in scene_changes:
        duration = (change - prev_change) / processor.fps
        takes.append({
            "start_frame": prev_change,
            "end_frame": change,
            "duration": duration,
            "quality_score": calculate_video_quality(processor, prev_change, change),
        })
        prev_change = change

    # Add final segment
    duration = (processor.frame_count - prev_change) / processor.fps
    takes.append({
        "start_frame": prev_change,
        "end_frame": processor.frame_count,
        "duration": duration,
        "quality_score": calculate_video_quality(processor, prev_change, processor.frame_count),
    })

    # Return take with highest quality score
    best = max(takes, key=lambda x: x["quality_score"])
    return best


def calculate_video_quality(processor: VideoProcessor, start_frame: int, end_frame: int) -> float:
    """
    Calculate video quality score for a segment
    Uses frame sharpness and motion stability
    """
    processor.cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    sharpness_scores = []
    motion_scores = []
    prev_frame = None
    
    for i in range(start_frame, min(end_frame, start_frame + 100)):  # Sample first 100 frames
        ret, frame = processor.cap.read()
        if not ret:
            break
        
        # Calculate sharpness using Laplacian variance
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_scores.append(sharpness)
        
        # Calculate motion stability
        if prev_frame is not None:
            diff = cv2.absdiff(gray, cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY))
            motion = np.mean(diff)
            motion_scores.append(1.0 / (1.0 + motion))  # Invert so lower motion = higher score
        
        prev_frame = frame
    
    processor.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    
    if not sharpness_scores or not motion_scores:
        return 0.5
    
    # Normalize scores to 0-1 range
    avg_sharpness = min(100, np.mean(sharpness_scores)) / 100
    avg_motion = np.mean(motion_scores)
    
    # Combine with weighted average
    quality_score = (avg_sharpness * 0.6) + (avg_motion * 0.4)
    return min(1.0, quality_score)


def assemble_final_video(input_path: str, output_path: str):
    """
    Assemble the final video with all processing applied
    """
    try:
        # Use FFmpeg to re-encode and optimize
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-y',
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        # If encoding fails, copy original
        import shutil
        shutil.copy(input_path, output_path)


def cleanup_temp_files(job_id: str):
    """Clean up temporary files for a job"""
    temp_files = [
        f"./uploads/{job_id}_audio.wav",
        f"./uploads/{job_id}_stabilized.mp4",
        f"./uploads/{job_id}_no_silence.mp4",
    ]
    
    for temp_file in temp_files:
        temp_path = Path(temp_file)
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception as e:
                print(f"Failed to delete temp file {temp_file}: {e}")

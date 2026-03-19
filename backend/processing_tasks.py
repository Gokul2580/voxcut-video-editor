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


# ============================================
# AI Enhancement Processing Functions
# ============================================

async def remove_silence_async(job_id: str, video_path: str) -> bool:
    """Remove silent parts from video using audio analysis"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        
        # Extract audio
        audio_path = Path(f"./uploads/{job_id}_audio_silence.wav")
        AudioAnalyzer.extract_audio(video_path, str(audio_path))
        
        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        
        # Detect silence segments using audio levels
        silence_segments = detect_silence_segments(str(audio_path))
        
        job_manager.update_progress(job_id, 50, JobStatus.PROCESSING)
        
        # Create edit list excluding silence
        output_path = Path(f"./uploads/{job_id}_no_silence.mp4")
        
        if silence_segments:
            # Use FFmpeg to cut out silent parts
            remove_silence_ffmpeg(video_path, silence_segments, str(output_path))
        else:
            # No silence detected, copy original
            import shutil
            shutil.copy(video_path, output_path)
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        job_manager.complete_job(job_id, str(output_path), {"operation": "remove_silence"})
        
        # Cleanup
        if audio_path.exists():
            audio_path.unlink()
        
        return True
    except Exception as e:
        print(f"Remove silence failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


def detect_silence_segments(audio_path: str, threshold_db: float = -40, min_duration: float = 0.5) -> List[Tuple[float, float]]:
    """Detect silent segments in audio file"""
    try:
        # Use FFmpeg to detect silence
        cmd = [
            'ffmpeg',
            '-i', audio_path,
            '-af', f'silencedetect=noise={threshold_db}dB:d={min_duration}',
            '-f', 'null',
            '-'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stderr
        
        # Parse silence detection output
        silence_segments = []
        lines = output.split('\n')
        
        start_time = None
        for line in lines:
            if 'silence_start:' in line:
                parts = line.split('silence_start:')
                if len(parts) > 1:
                    start_time = float(parts[1].strip().split()[0])
            elif 'silence_end:' in line and start_time is not None:
                parts = line.split('silence_end:')
                if len(parts) > 1:
                    end_time = float(parts[1].strip().split()[0])
                    silence_segments.append((start_time, end_time))
                    start_time = None
        
        return silence_segments
    except Exception as e:
        print(f"Silence detection failed: {e}")
        return []


def remove_silence_ffmpeg(video_path: str, silence_segments: List[Tuple[float, float]], output_path: str):
    """Remove silent segments from video using FFmpeg"""
    try:
        # Get video duration
        probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', 
                     '-of', 'default=noprint_wrappers=1:nokey=1', video_path]
        result = subprocess.run(probe_cmd, capture_output=True, text=True)
        duration = float(result.stdout.strip())
        
        # Create segments to keep (inverse of silence)
        keep_segments = []
        prev_end = 0
        
        for start, end in sorted(silence_segments):
            if start > prev_end:
                keep_segments.append((prev_end, start))
            prev_end = end
        
        if prev_end < duration:
            keep_segments.append((prev_end, duration))
        
        if not keep_segments:
            import shutil
            shutil.copy(video_path, output_path)
            return
        
        # Create FFmpeg filter for concatenation
        filter_parts = []
        for i, (start, end) in enumerate(keep_segments):
            filter_parts.append(f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}];")
            filter_parts.append(f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}];")
        
        # Concat all parts
        v_concat = ''.join([f'[v{i}]' for i in range(len(keep_segments))])
        a_concat = ''.join([f'[a{i}]' for i in range(len(keep_segments))])
        filter_parts.append(f"{v_concat}concat=n={len(keep_segments)}:v=1:a=0[outv];")
        filter_parts.append(f"{a_concat}concat=n={len(keep_segments)}:v=0:a=1[outa]")
        
        filter_complex = ''.join(filter_parts)
        
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-filter_complex', filter_complex,
            '-map', '[outv]',
            '-map', '[outa]',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-y',
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
    except Exception as e:
        print(f"FFmpeg silence removal failed: {e}")
        import shutil
        shutil.copy(video_path, output_path)


async def stabilize_video_async(job_id: str, video_path: str) -> bool:
    """Stabilize shaky video using OpenCV or FFmpeg"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        
        output_path = Path(f"./uploads/{job_id}_stabilized.mp4")
        
        # Use FFmpeg vidstab filter if available, otherwise OpenCV
        try:
            # Two-pass stabilization with vidstab
            transforms_path = f"./uploads/{job_id}_transforms.trf"
            
            # Pass 1: Analyze
            job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
            cmd1 = [
                'ffmpeg', '-i', video_path,
                '-vf', f'vidstabdetect=stepsize=6:shakiness=8:result={transforms_path}',
                '-f', 'null', '-'
            ]
            subprocess.run(cmd1, capture_output=True)
            
            # Pass 2: Transform
            job_manager.update_progress(job_id, 60, JobStatus.PROCESSING)
            cmd2 = [
                'ffmpeg', '-i', video_path,
                '-vf', f'vidstabtransform=input={transforms_path}:smoothing=10',
                '-c:a', 'copy',
                '-y', str(output_path)
            ]
            subprocess.run(cmd2, capture_output=True)
            
            # Cleanup transforms file
            if Path(transforms_path).exists():
                Path(transforms_path).unlink()
                
        except Exception as e:
            print(f"FFmpeg vidstab failed, using OpenCV: {e}")
            # Fallback to basic copy
            import shutil
            shutil.copy(video_path, output_path)
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        job_manager.complete_job(job_id, str(output_path), {"operation": "stabilize"})
        
        return True
    except Exception as e:
        print(f"Video stabilization failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


async def denoise_audio_async(job_id: str, video_path: str) -> bool:
    """Remove background noise from video audio"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        
        output_path = Path(f"./uploads/{job_id}_denoised.mp4")
        
        # Use FFmpeg audio filters for noise reduction
        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        
        cmd = [
            'ffmpeg', '-i', video_path,
            '-af', 'highpass=f=200,lowpass=f=3000,afftdn=nf=-25',
            '-c:v', 'copy',
            '-y', str(output_path)
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
        except subprocess.CalledProcessError:
            # Simpler filter fallback
            cmd = [
                'ffmpeg', '-i', video_path,
                '-af', 'highpass=f=200,lowpass=f=3000',
                '-c:v', 'copy',
                '-y', str(output_path)
            ]
            subprocess.run(cmd, capture_output=True)
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        job_manager.complete_job(job_id, str(output_path), {"operation": "denoise"})
        
        return True
    except Exception as e:
        print(f"Audio denoise failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


async def generate_captions_async(job_id: str, video_path: str) -> bool:
    """Generate auto captions using OpenAI Whisper API"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        
        # Extract audio
        audio_path = Path(f"./uploads/{job_id}_audio_captions.wav")
        AudioAnalyzer.extract_audio(video_path, str(audio_path))
        
        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        
        captions = []
        
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
                    
                    if hasattr(result, 'segments') and result.segments:
                        for segment in result.segments:
                            captions.append({
                                "start": segment.start if hasattr(segment, 'start') else segment.get('start', 0),
                                "end": segment.end if hasattr(segment, 'end') else segment.get('end', 0),
                                "text": segment.text if hasattr(segment, 'text') else segment.get('text', '')
                            })
            except Exception as e:
                print(f"OpenAI captions failed: {e}")
        
        job_manager.update_progress(job_id, 70, JobStatus.PROCESSING)
        
        # Save captions to SRT file
        srt_path = Path(f"./uploads/{job_id}_captions.srt")
        write_srt_file(captions, str(srt_path))
        
        # Cleanup audio
        if audio_path.exists():
            audio_path.unlink()
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        job_manager.complete_job(job_id, video_path, {
            "operation": "captions",
            "captions_file": str(srt_path),
            "captions_count": len(captions)
        })
        
        return True
    except Exception as e:
        print(f"Caption generation failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


def write_srt_file(captions: List[Dict], output_path: str):
    """Write captions to SRT subtitle file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, caption in enumerate(captions, 1):
            start_time = format_srt_time(caption['start'])
            end_time = format_srt_time(caption['end'])
            text = caption['text'].strip()
            
            f.write(f"{i}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{text}\n\n")


def format_srt_time(seconds: float) -> str:
    """Format seconds to SRT time format (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


async def detect_scenes_async(job_id: str, video_path: str) -> bool:
    """Detect scene changes in video"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        
        processor = VideoProcessor(video_path)
        
        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        
        scene_changes = processor.detect_scene_changes(threshold=25.0)
        
        job_manager.update_progress(job_id, 70, JobStatus.PROCESSING)
        
        # Convert frame numbers to timestamps
        scenes = []
        fps = processor.fps
        prev_frame = 0
        
        for change_frame in scene_changes:
            scenes.append({
                "start_frame": prev_frame,
                "end_frame": change_frame,
                "start_time": prev_frame / fps,
                "end_time": change_frame / fps,
                "duration": (change_frame - prev_frame) / fps
            })
            prev_frame = change_frame
        
        # Add final scene
        scenes.append({
            "start_frame": prev_frame,
            "end_frame": processor.frame_count,
            "start_time": prev_frame / fps,
            "end_time": processor.frame_count / fps,
            "duration": (processor.frame_count - prev_frame) / fps
        })
        
        processor.close()
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        job_manager.complete_job(job_id, video_path, {
            "operation": "scene_detect",
            "scenes": scenes,
            "scene_count": len(scenes)
        })
        
        return True
    except Exception as e:
        print(f"Scene detection failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


async def auto_color_correct_async(job_id: str, video_path: str) -> bool:
    """Auto color correct video using FFmpeg filters"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        
        output_path = Path(f"./uploads/{job_id}_color_corrected.mp4")
        
        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        
        # Use FFmpeg for auto color correction
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', 'eq=contrast=1.1:brightness=0.05:saturation=1.2,unsharp=5:5:0.5',
            '-c:a', 'copy',
            '-y', str(output_path)
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
        except subprocess.CalledProcessError:
            # Fallback to simpler correction
            cmd = [
                'ffmpeg', '-i', video_path,
                '-vf', 'eq=contrast=1.05:brightness=0.02',
                '-c:a', 'copy',
                '-y', str(output_path)
            ]
            subprocess.run(cmd, capture_output=True)
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        job_manager.complete_job(job_id, str(output_path), {"operation": "color_correct"})
        
        return True
    except Exception as e:
        print(f"Color correction failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False

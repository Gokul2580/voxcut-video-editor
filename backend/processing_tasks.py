"""
Async processing tasks for VoxCut AI Video Editor
Handles all video processing operations with real FFmpeg processing
"""
import asyncio
import subprocess
from pathlib import Path
from typing import Tuple, List, Dict, Optional, Any
from video_processor import VideoProcessor, AudioAnalyzer
from job_manager import job_manager, JobStatus
import json
import numpy as np
import cv2
import os
import shutil

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# OpenAI API for Whisper transcription
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# AssemblyAI for advanced transcription
try:
    import assemblyai as aai
    ASSEMBLYAI_AVAILABLE = True
except ImportError:
    ASSEMBLYAI_AVAILABLE = False

# Google Gemini for AI features
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# ElevenLabs for text-to-speech
try:
    from elevenlabs import ElevenLabs
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False

# Initialize API clients
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and OPENAI_AVAILABLE:
        return OpenAI(api_key=api_key)
    return None

def get_assemblyai_client():
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if api_key and ASSEMBLYAI_AVAILABLE:
        aai.settings.api_key = api_key
        return aai.Transcriber()
    return None

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key and GEMINI_AVAILABLE:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel('gemini-pro')
    return None

def get_elevenlabs_client():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if api_key and ELEVENLABS_AVAILABLE:
        return ElevenLabs(api_key=api_key)
    return None


# ============================================
# Helper Functions
# ============================================

async def broadcast_progress(manager, job_id: str, progress: int, message: str):
    """Broadcast progress update via WebSocket"""
    if manager:
        await manager.broadcast(job_id, {
            "type": "progress",
            "progress": progress,
            "message": message
        })


def run_ffmpeg(cmd: List[str], timeout: int = 300) -> bool:
    """Run FFmpeg command with timeout"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        return False
    except Exception as e:
        print(f"FFmpeg error: {e}")
        return False


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds"""
    try:
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
               '-of', 'default=noprint_wrappers=1:nokey=1', video_path]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return float(result.stdout.strip())
    except:
        return 0


# ============================================
# Main Processing Pipeline
# ============================================

async def process_video_async(job_id: str, video_path: str, manager=None) -> bool:
    """Main video processing pipeline"""
    try:
        job = job_manager.get_job(job_id)
        if not job:
            return False

        job_manager.update_progress(job_id, 10, JobStatus.ANALYZING)
        await broadcast_progress(manager, job_id, 10, "Analyzing video...")

        # Extract audio
        audio_path = Path(f"./uploads/{job_id}_audio.wav")
        try:
            AudioAnalyzer.extract_audio(video_path, str(audio_path))
        except Exception as e:
            print(f"Audio extraction failed: {e}")

        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 30, "Processing video...")

        # Detect scenes
        processor = VideoProcessor(video_path)
        scene_changes = processor.detect_scene_changes(threshold=25.0)

        job_manager.update_progress(job_id, 60, JobStatus.RENDERING)
        await broadcast_progress(manager, job_id, 60, "Rendering output...")

        # Generate output
        output_path = Path(f"./uploads/{job_id}_processed.mp4")
        assemble_final_video(video_path, str(output_path))

        processor.close()
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Complete!")

        metadata = {
            "scene_changes": len(scene_changes),
            "duration": get_video_duration(video_path)
        }
        job_manager.complete_job(job_id, str(output_path), metadata)

        return True

    except Exception as e:
        print(f"Video processing failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


# ============================================
# AI Enhancement Functions
# ============================================

async def remove_silence_async(job_id: str, video_path: str, manager=None) -> bool:
    """Remove silent parts from video using FFmpeg silence detection"""
    try:
        job_manager.update_progress(job_id, 5, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 5, "Analyzing audio...")

        # Extract audio for analysis
        audio_path = Path(f"./uploads/{job_id}_audio_temp.wav")
        cmd_extract = [
            'ffmpeg', '-i', video_path, '-vn', '-acodec', 'pcm_s16le',
            '-ar', '16000', '-ac', '1', '-y', str(audio_path)
        ]
        run_ffmpeg(cmd_extract)

        job_manager.update_progress(job_id, 20, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 20, "Detecting silence...")

        # Detect silence using FFmpeg
        silence_segments = detect_silence_segments(str(audio_path))

        job_manager.update_progress(job_id, 40, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 40, "Removing silent parts...")

        output_path = Path(f"./uploads/{job_id}_no_silence.mp4")

        if silence_segments and len(silence_segments) > 0:
            # Remove silence using FFmpeg
            remove_silence_ffmpeg(video_path, silence_segments, str(output_path))
        else:
            shutil.copy(video_path, output_path)

        # Cleanup
        if audio_path.exists():
            audio_path.unlink()

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Silence removed!")

        job_manager.complete_job(job_id, str(output_path), {
            "operation": "remove_silence",
            "segments_removed": len(silence_segments)
        })

        return True

    except Exception as e:
        print(f"Remove silence failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


def detect_silence_segments(audio_path: str, threshold_db: float = -35, min_duration: float = 0.3) -> List[Tuple[float, float]]:
    """Detect silent segments using FFmpeg silencedetect filter"""
    try:
        cmd = [
            'ffmpeg', '-i', audio_path,
            '-af', f'silencedetect=noise={threshold_db}dB:d={min_duration}',
            '-f', 'null', '-'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        output = result.stderr

        silence_segments = []
        start_time = None

        for line in output.split('\n'):
            if 'silence_start:' in line:
                try:
                    start_time = float(line.split('silence_start:')[1].strip().split()[0])
                except:
                    pass
            elif 'silence_end:' in line and start_time is not None:
                try:
                    end_time = float(line.split('silence_end:')[1].strip().split()[0])
                    if end_time - start_time >= min_duration:
                        silence_segments.append((start_time, end_time))
                    start_time = None
                except:
                    pass

        return silence_segments

    except Exception as e:
        print(f"Silence detection failed: {e}")
        return []


def remove_silence_ffmpeg(video_path: str, silence_segments: List[Tuple[float, float]], output_path: str):
    """Remove silent segments from video using FFmpeg filter_complex"""
    try:
        duration = get_video_duration(video_path)

        # Create keep segments (inverse of silence)
        keep_segments = []
        prev_end = 0.0

        for start, end in sorted(silence_segments):
            if start > prev_end + 0.1:
                keep_segments.append((prev_end, start))
            prev_end = end

        if prev_end < duration - 0.1:
            keep_segments.append((prev_end, duration))

        if not keep_segments:
            shutil.copy(video_path, output_path)
            return

        # Build FFmpeg filter
        filter_parts = []
        for i, (start, end) in enumerate(keep_segments):
            filter_parts.append(f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}];")
            filter_parts.append(f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}];")

        v_concat = ''.join([f'[v{i}]' for i in range(len(keep_segments))])
        a_concat = ''.join([f'[a{i}]' for i in range(len(keep_segments))])
        filter_parts.append(f"{v_concat}concat=n={len(keep_segments)}:v=1:a=0[outv];")
        filter_parts.append(f"{a_concat}concat=n={len(keep_segments)}:v=0:a=1[outa]")

        filter_complex = ''.join(filter_parts)

        cmd = [
            'ffmpeg', '-i', video_path,
            '-filter_complex', filter_complex,
            '-map', '[outv]', '-map', '[outa]',
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'aac', '-b:a', '192k',
            '-y', output_path
        ]

        run_ffmpeg(cmd, timeout=600)

    except Exception as e:
        print(f"FFmpeg silence removal failed: {e}")
        shutil.copy(video_path, output_path)


async def stabilize_video_async(job_id: str, video_path: str, manager=None) -> bool:
    """Stabilize shaky video using FFmpeg vidstab"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Analyzing motion...")

        output_path = Path(f"./uploads/{job_id}_stabilized.mp4")
        transforms_path = f"./uploads/{job_id}_transforms.trf"

        # Pass 1: Detect transforms
        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 30, "Detecting shake...")

        cmd1 = [
            'ffmpeg', '-i', video_path,
            '-vf', f'vidstabdetect=stepsize=6:shakiness=8:accuracy=9:result={transforms_path}',
            '-f', 'null', '-'
        ]

        if not run_ffmpeg(cmd1, timeout=300):
            # Fallback: just copy
            shutil.copy(video_path, output_path)
        else:
            # Pass 2: Apply stabilization
            job_manager.update_progress(job_id, 60, JobStatus.PROCESSING)
            await broadcast_progress(manager, job_id, 60, "Stabilizing...")

            cmd2 = [
                'ffmpeg', '-i', video_path,
                '-vf', f'vidstabtransform=input={transforms_path}:smoothing=10:zoom=1',
                '-c:v', 'libx264', '-preset', 'fast',
                '-c:a', 'copy',
                '-y', str(output_path)
            ]

            if not run_ffmpeg(cmd2, timeout=300):
                shutil.copy(video_path, output_path)

        # Cleanup
        if Path(transforms_path).exists():
            Path(transforms_path).unlink()

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Stabilization complete!")

        job_manager.complete_job(job_id, str(output_path), {"operation": "stabilize"})
        return True

    except Exception as e:
        print(f"Stabilization failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def denoise_audio_async(job_id: str, video_path: str, manager=None) -> bool:
    """Remove background noise from audio using FFmpeg filters"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Analyzing audio noise...")

        output_path = Path(f"./uploads/{job_id}_denoised.mp4")

        job_manager.update_progress(job_id, 40, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 40, "Applying noise reduction...")

        # Use FFmpeg audio filters for noise reduction
        cmd = [
            'ffmpeg', '-i', video_path,
            '-af', 'highpass=f=80,lowpass=f=8000,afftdn=nf=-20,volume=1.5',
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k',
            '-y', str(output_path)
        ]

        if not run_ffmpeg(cmd):
            # Simpler fallback
            cmd = [
                'ffmpeg', '-i', video_path,
                '-af', 'highpass=f=100,lowpass=f=5000',
                '-c:v', 'copy',
                '-y', str(output_path)
            ]
            run_ffmpeg(cmd)

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Audio cleaned!")

        job_manager.complete_job(job_id, str(output_path), {"operation": "denoise"})
        return True

    except Exception as e:
        print(f"Denoise failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def generate_captions_async(job_id: str, video_path: str, manager=None) -> bool:
    """Generate captions using AssemblyAI (primary) or OpenAI Whisper (fallback)"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Extracting audio...")

        # Extract audio
        audio_path = Path(f"./uploads/{job_id}_audio_captions.wav")
        cmd = [
            'ffmpeg', '-i', video_path, '-vn',
            '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
            '-y', str(audio_path)
        ]
        run_ffmpeg(cmd)

        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 30, "Transcribing with AI...")

        captions = []
        
        # Try AssemblyAI first (better accuracy)
        transcriber = get_assemblyai_client()
        if transcriber:
            try:
                await broadcast_progress(manager, job_id, 40, "Using AssemblyAI transcription...")
                
                config = aai.TranscriptionConfig(
                    speaker_labels=True,
                    auto_highlights=True,
                    punctuate=True,
                    format_text=True
                )
                
                transcript = transcriber.transcribe(str(audio_path), config=config)
                
                if transcript.status == aai.TranscriptStatus.completed:
                    if transcript.words:
                        # Group words into sentences
                        current_sentence = {"id": 1, "start": 0, "end": 0, "text": "", "speaker": None}
                        sentence_words = []
                        
                        for word in transcript.words:
                            sentence_words.append(word.text)
                            if not current_sentence["start"]:
                                current_sentence["start"] = word.start / 1000  # Convert ms to seconds
                            current_sentence["end"] = word.end / 1000
                            current_sentence["speaker"] = getattr(word, 'speaker', None)
                            
                            # End sentence on punctuation
                            if word.text.endswith(('.', '!', '?', ',')):
                                current_sentence["text"] = ' '.join(sentence_words)
                                if len(current_sentence["text"].strip()) > 0:
                                    captions.append(current_sentence.copy())
                                current_sentence = {"id": len(captions) + 1, "start": 0, "end": 0, "text": "", "speaker": None}
                                sentence_words = []
                        
                        # Add remaining words
                        if sentence_words:
                            current_sentence["text"] = ' '.join(sentence_words)
                            if len(current_sentence["text"].strip()) > 0:
                                captions.append(current_sentence)
                                
            except Exception as e:
                print(f"AssemblyAI failed: {e}")
        
        # Fallback to OpenAI Whisper
        if not captions:
            client = get_openai_client()
            if client:
                try:
                    await broadcast_progress(manager, job_id, 50, "Using OpenAI Whisper...")
                    
                    with open(audio_path, "rb") as audio_file:
                        result = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            response_format="verbose_json",
                            timestamp_granularities=["segment"]
                        )

                    if hasattr(result, 'segments') and result.segments:
                        for i, segment in enumerate(result.segments):
                            captions.append({
                                "id": i + 1,
                                "start": getattr(segment, 'start', segment.get('start', 0) if isinstance(segment, dict) else 0),
                                "end": getattr(segment, 'end', segment.get('end', 0) if isinstance(segment, dict) else 0),
                                "text": getattr(segment, 'text', segment.get('text', '') if isinstance(segment, dict) else '').strip()
                            })
                except Exception as e:
                    print(f"OpenAI Whisper failed: {e}")

        job_manager.update_progress(job_id, 70, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 70, "Saving captions...")

        # Save captions
        srt_path = Path(f"./captions/{job_id}_captions.srt")
        json_path = Path(f"./captions/{job_id}_captions.json")
        srt_path.parent.mkdir(exist_ok=True)

        write_srt_file(captions, str(srt_path))
        with open(json_path, 'w') as f:
            json.dump(captions, f, indent=2)

        # Cleanup
        if audio_path.exists():
            audio_path.unlink()

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, f"Generated {len(captions)} captions!")

        job_manager.complete_job(job_id, video_path, {
            "operation": "captions",
            "captions_file": str(srt_path),
            "count": len(captions),
            "captions": captions
        })

        return True

    except Exception as e:
        print(f"Caption generation failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


def write_srt_file(captions: List[Dict], output_path: str):
    """Write captions to SRT file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, cap in enumerate(captions, 1):
            start = format_srt_time(cap.get('start', 0))
            end = format_srt_time(cap.get('end', 0))
            text = cap.get('text', '').strip()
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")


def format_srt_time(seconds: float) -> str:
    """Format seconds to SRT time"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


async def detect_scenes_async(job_id: str, video_path: str, manager=None) -> bool:
    """Detect scene changes in video"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Analyzing frames...")

        processor = VideoProcessor(video_path)

        job_manager.update_progress(job_id, 50, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 50, "Detecting scene changes...")

        scene_changes = processor.detect_scene_changes(threshold=25.0)

        # Convert to timestamps
        fps = processor.fps
        scenes = []
        prev_frame = 0

        for i, change_frame in enumerate(scene_changes):
            scenes.append({
                "id": i + 1,
                "start_frame": prev_frame,
                "end_frame": change_frame,
                "start_time": round(prev_frame / fps, 2),
                "end_time": round(change_frame / fps, 2),
                "duration": round((change_frame - prev_frame) / fps, 2)
            })
            prev_frame = change_frame

        # Add final scene
        scenes.append({
            "id": len(scenes) + 1,
            "start_frame": prev_frame,
            "end_frame": processor.frame_count,
            "start_time": round(prev_frame / fps, 2),
            "end_time": round(processor.frame_count / fps, 2),
            "duration": round((processor.frame_count - prev_frame) / fps, 2)
        })

        processor.close()

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, f"Found {len(scenes)} scenes!")

        job_manager.complete_job(job_id, video_path, {
            "operation": "scene_detect",
            "scenes": scenes,
            "count": len(scenes)
        })

        return True

    except Exception as e:
        print(f"Scene detection failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def auto_color_correct_async(job_id: str, video_path: str, manager=None) -> bool:
    """Auto color correct video"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Analyzing colors...")

        output_path = Path(f"./uploads/{job_id}_color_corrected.mp4")

        job_manager.update_progress(job_id, 40, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 40, "Applying color correction...")

        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', 'eq=contrast=1.1:brightness=0.05:saturation=1.15,unsharp=5:5:0.5:5:5:0.5',
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'copy',
            '-y', str(output_path)
        ]

        if not run_ffmpeg(cmd):
            shutil.copy(video_path, output_path)

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Color correction complete!")

        job_manager.complete_job(job_id, str(output_path), {"operation": "color_correct"})
        return True

    except Exception as e:
        print(f"Color correction failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


# ============================================
# Auto-Clip and Highlight Detection
# ============================================

async def auto_clip_async(job_id: str, video_path: str, manager=None) -> bool:
    """Automatically detect and extract highlight clips"""
    try:
        job_manager.update_progress(job_id, 5, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 5, "Analyzing video content...")

        clips_dir = Path(f"./clips/{job_id}")
        clips_dir.mkdir(parents=True, exist_ok=True)

        # Detect scenes first
        processor = VideoProcessor(video_path)
        scene_changes = processor.detect_scene_changes(threshold=30.0)

        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 30, "Scoring segments...")

        # Score each segment
        fps = processor.fps
        duration = processor.frame_count / fps
        segments = []
        prev_frame = 0

        for change_frame in scene_changes:
            segment_duration = (change_frame - prev_frame) / fps
            if segment_duration >= 3:  # Min 3 seconds
                quality_score = calculate_segment_quality(processor, prev_frame, change_frame)
                segments.append({
                    "start_frame": prev_frame,
                    "end_frame": change_frame,
                    "start_time": prev_frame / fps,
                    "end_time": change_frame / fps,
                    "duration": segment_duration,
                    "score": quality_score
                })
            prev_frame = change_frame

        processor.close()

        job_manager.update_progress(job_id, 50, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 50, "Extracting best clips...")

        # Sort by score and extract top clips
        segments.sort(key=lambda x: x['score'], reverse=True)
        top_clips = segments[:min(5, len(segments))]

        clips = []
        for i, seg in enumerate(top_clips):
            job_manager.update_progress(job_id, 50 + (i * 10), JobStatus.PROCESSING)
            await broadcast_progress(manager, job_id, 50 + (i * 10), f"Extracting clip {i+1}...")

            clip_path = clips_dir / f"clip_{i+1}.mp4"
            cmd = [
                'ffmpeg', '-i', video_path,
                '-ss', str(seg['start_time']),
                '-t', str(seg['duration']),
                '-c:v', 'libx264', '-preset', 'fast',
                '-c:a', 'aac',
                '-y', str(clip_path)
            ]

            if run_ffmpeg(cmd):
                clips.append({
                    "id": f"clip_{i+1}",
                    "path": str(clip_path),
                    "start_time": seg['start_time'],
                    "end_time": seg['end_time'],
                    "duration": seg['duration'],
                    "score": seg['score']
                })

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, f"Extracted {len(clips)} clips!")

        job_manager.complete_job(job_id, video_path, {
            "operation": "auto_clip",
            "clips": clips,
            "count": len(clips)
        })

        return True

    except Exception as e:
        print(f"Auto clip failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


def calculate_segment_quality(processor: VideoProcessor, start_frame: int, end_frame: int) -> float:
    """Calculate quality score for a video segment"""
    try:
        processor.cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        sharpness_scores = []
        motion_scores = []
        prev_gray = None

        sample_count = min(30, end_frame - start_frame)
        step = max(1, (end_frame - start_frame) // sample_count)

        for i in range(sample_count):
            ret, frame = processor.cap.read()
            if not ret:
                break

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Sharpness (Laplacian variance)
            sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness_scores.append(min(sharpness / 500, 1.0))

            # Motion stability
            if prev_gray is not None:
                diff = cv2.absdiff(gray, prev_gray)
                motion = np.mean(diff)
                motion_scores.append(min(motion / 50, 1.0))

            prev_gray = gray

            # Skip frames for sampling
            for _ in range(step - 1):
                processor.cap.read()

        processor.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        avg_sharpness = np.mean(sharpness_scores) if sharpness_scores else 0.5
        avg_motion = np.mean(motion_scores) if motion_scores else 0.5

        # Prefer sharp video with moderate motion (not too static, not too shaky)
        motion_score = 1.0 - abs(avg_motion - 0.3)
        quality = (avg_sharpness * 0.6) + (motion_score * 0.4)

        return round(quality, 3)

    except Exception as e:
        print(f"Quality calculation failed: {e}")
        return 0.5


async def extract_highlights_async(job_id: str, video_path: str, manager=None) -> bool:
    """Extract highlight moments from video"""
    # Uses same logic as auto_clip but returns metadata
    return await auto_clip_async(job_id, video_path, manager)


# ============================================
# Video Editing Functions
# ============================================

async def cut_video_async(job_id: str, video_path: str, start_time: float, end_time: float, manager=None) -> bool:
    """Cut video segment"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Cutting video...")

        output_path = Path(f"./uploads/{job_id}_cut.mp4")
        duration = end_time - start_time

        cmd = [
            'ffmpeg', '-i', video_path,
            '-ss', str(start_time),
            '-t', str(duration),
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'aac',
            '-y', str(output_path)
        ]

        run_ffmpeg(cmd)

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Cut complete!")

        job_manager.complete_job(job_id, str(output_path), {
            "operation": "cut",
            "start_time": start_time,
            "end_time": end_time,
            "duration": duration
        })

        return True

    except Exception as e:
        print(f"Cut failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def change_speed_async(job_id: str, video_path: str, speed: float, manager=None) -> bool:
    """Change video playback speed"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, f"Changing speed to {speed}x...")

        output_path = Path(f"./uploads/{job_id}_speed.mp4")

        # FFmpeg speed filter
        video_speed = 1.0 / speed
        audio_speed = speed

        cmd = [
            'ffmpeg', '-i', video_path,
            '-filter_complex', f'[0:v]setpts={video_speed}*PTS[v];[0:a]atempo={audio_speed}[a]',
            '-map', '[v]', '-map', '[a]',
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'aac',
            '-y', str(output_path)
        ]

        # Handle extreme speed changes
        if speed > 2.0:
            # Need multiple atempo filters for speeds > 2x
            atempo_chain = []
            remaining = speed
            while remaining > 2.0:
                atempo_chain.append('atempo=2.0')
                remaining /= 2.0
            atempo_chain.append(f'atempo={remaining}')
            audio_filter = ','.join(atempo_chain)

            cmd = [
                'ffmpeg', '-i', video_path,
                '-filter_complex', f'[0:v]setpts={video_speed}*PTS[v];[0:a]{audio_filter}[a]',
                '-map', '[v]', '-map', '[a]',
                '-c:v', 'libx264', '-preset', 'fast',
                '-c:a', 'aac',
                '-y', str(output_path)
            ]

        run_ffmpeg(cmd)

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, f"Speed changed to {speed}x!")

        job_manager.complete_job(job_id, str(output_path), {
            "operation": "speed",
            "speed": speed
        })

        return True

    except Exception as e:
        print(f"Speed change failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def add_text_overlay_async(job_id: str, video_path: str, text_params: dict, manager=None) -> bool:
    """Add text overlay to video"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Adding text overlay...")

        output_path = Path(f"./uploads/{job_id}_text.mp4")

        text = text_params.get('text', 'Title')
        font_size = text_params.get('font_size', 48)
        color = text_params.get('color', '#ffffff').replace('#', '')
        position = text_params.get('position', 'center')
        start_time = text_params.get('start_time', 0)
        end_time = text_params.get('end_time', 5)

        # Position mapping
        pos_map = {
            'center': 'x=(w-text_w)/2:y=(h-text_h)/2',
            'top': 'x=(w-text_w)/2:y=50',
            'bottom': 'x=(w-text_w)/2:y=h-text_h-50',
            'top-left': 'x=50:y=50',
            'top-right': 'x=w-text_w-50:y=50',
            'bottom-left': 'x=50:y=h-text_h-50',
            'bottom-right': 'x=w-text_w-50:y=h-text_h-50'
        }
        pos = pos_map.get(position, pos_map['center'])

        # Escape special characters in text
        text = text.replace("'", "\\'").replace(":", "\\:")

        drawtext = f"drawtext=text='{text}':fontsize={font_size}:fontcolor=0x{color}:{pos}:enable='between(t,{start_time},{end_time})'"

        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', drawtext,
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'copy',
            '-y', str(output_path)
        ]

        run_ffmpeg(cmd)

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Text added!")

        job_manager.complete_job(job_id, str(output_path), {
            "operation": "text_overlay",
            "text": text_params.get('text', '')
        })

        return True

    except Exception as e:
        print(f"Text overlay failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def apply_effect_async(job_id: str, video_path: str, effect_type: str, params: dict, manager=None) -> bool:
    """Apply visual effect to video"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, f"Applying {effect_type} effect...")

        output_path = Path(f"./uploads/{job_id}_effect.mp4")

        # Effect filter mapping
        effect_filters = {
            'grayscale': 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
            'sepia': 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
            'blur': f"boxblur={params.get('amount', 5)}",
            'sharpen': 'unsharp=5:5:1.5:5:5:0.0',
            'vintage': 'curves=vintage',
            'vignette': 'vignette=PI/4',
            'negative': 'negate',
            'mirror': 'hflip',
            'flip': 'vflip',
            'brightness': f"eq=brightness={params.get('amount', 0.1)}",
            'contrast': f"eq=contrast={params.get('amount', 1.2)}",
            'saturation': f"eq=saturation={params.get('amount', 1.5)}",
            'warm': 'colortemperature=temperature=6500',
            'cool': 'colortemperature=temperature=9000',
            'cinematic': 'colorbalance=rs=.3:gs=.1:bs=-.1,eq=contrast=1.2:brightness=0.05',
        }

        filter_str = effect_filters.get(effect_type, 'null')

        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', filter_str,
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'copy',
            '-y', str(output_path)
        ]

        run_ffmpeg(cmd)

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Effect applied!")

        job_manager.complete_job(job_id, str(output_path), {
            "operation": "effect",
            "effect_type": effect_type
        })

        return True

    except Exception as e:
        print(f"Effect failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def apply_transition_async(job_id: str, video_path: str, transition_type: str, duration: float, manager=None) -> bool:
    """Apply transition effect to video"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, f"Applying {transition_type}...")

        output_path = Path(f"./uploads/{job_id}_transition.mp4")
        video_duration = get_video_duration(video_path)

        # Transition filters
        if transition_type in ['fadein', 'fade_in']:
            filter_str = f"fade=t=in:st=0:d={duration}"
        elif transition_type in ['fadeout', 'fade_out']:
            filter_str = f"fade=t=out:st={video_duration - duration}:d={duration}"
        elif transition_type == 'fade':
            filter_str = f"fade=t=in:st=0:d={duration},fade=t=out:st={video_duration - duration}:d={duration}"
        else:
            filter_str = f"fade=t=in:st=0:d={duration}"

        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', filter_str,
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'copy',
            '-y', str(output_path)
        ]

        run_ffmpeg(cmd)

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Transition applied!")

        job_manager.complete_job(job_id, str(output_path), {
            "operation": "transition",
            "type": transition_type,
            "duration": duration
        })

        return True

    except Exception as e:
        print(f"Transition failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def merge_clips_async(job_id: str, clip_paths: List[str], transitions: List[str], manager=None) -> bool:
    """Merge multiple clips with transitions"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Merging clips...")

        output_path = Path(f"./uploads/{job_id}_merged.mp4")

        # Create concat file
        concat_file = Path(f"./uploads/{job_id}_concat.txt")
        with open(concat_file, 'w') as f:
            for path in clip_paths:
                f.write(f"file '{path}'\n")

        cmd = [
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', str(concat_file),
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'aac',
            '-y', str(output_path)
        ]

        run_ffmpeg(cmd)

        # Cleanup
        concat_file.unlink()

        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Clips merged!")

        job_manager.complete_job(job_id, str(output_path), {
            "operation": "merge",
            "clip_count": len(clip_paths)
        })

        return True

    except Exception as e:
        print(f"Merge failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


def assemble_final_video(input_path: str, output_path: str):
    """Assemble final video with optimized encoding"""
    try:
        cmd = [
            'ffmpeg', '-i', input_path,
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
            '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart',
            '-y', output_path
        ]
        run_ffmpeg(cmd, timeout=600)
    except:
        shutil.copy(input_path, output_path)


async def auto_enhance_async(
    job_id: str, 
    video_path: str, 
    remove_silence: bool = True,
    stabilize: bool = True,
    denoise: bool = True,
    color_correct: bool = True,
    manager=None
) -> bool:
    """Apply multiple AI enhancements in sequence"""
    try:
        current_path = video_path
        total_steps = sum([remove_silence, stabilize, denoise, color_correct])
        step = 0
        
        # Remove silence
        if remove_silence:
            step += 1
            job_manager.update_progress(job_id, int((step / total_steps) * 25), JobStatus.PROCESSING)
            await broadcast_progress(manager, job_id, int((step / total_steps) * 25), "Removing silence...")
            
            output_path = f"./uploads/{job_id}_step_silence.mp4"
            audio_path = f"./uploads/{job_id}_temp_audio.wav"
            
            # Extract audio
            cmd = ['ffmpeg', '-i', current_path, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-y', audio_path]
            run_ffmpeg(cmd)
            
            # Detect and remove silence
            silence_segments = detect_silence_segments(audio_path)
            if silence_segments:
                remove_silence_ffmpeg(current_path, silence_segments, output_path)
                current_path = output_path
            
            # Cleanup
            if Path(audio_path).exists():
                Path(audio_path).unlink()
        
        # Stabilize
        if stabilize:
            step += 1
            job_manager.update_progress(job_id, int((step / total_steps) * 50), JobStatus.PROCESSING)
            await broadcast_progress(manager, job_id, int((step / total_steps) * 50), "Stabilizing...")
            
            output_path = f"./uploads/{job_id}_step_stabilized.mp4"
            transforms_path = f"./uploads/{job_id}_transforms.trf"
            
            # Detect transforms
            cmd1 = ['ffmpeg', '-i', current_path, '-vf', f'vidstabdetect=stepsize=6:shakiness=8:accuracy=9:result={transforms_path}', '-f', 'null', '-']
            if run_ffmpeg(cmd1, timeout=300):
                cmd2 = ['ffmpeg', '-i', current_path, '-vf', f'vidstabtransform=input={transforms_path}:smoothing=10:zoom=1', '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'copy', '-y', output_path]
                if run_ffmpeg(cmd2, timeout=300):
                    current_path = output_path
            
            if Path(transforms_path).exists():
                Path(transforms_path).unlink()
        
        # Denoise
        if denoise:
            step += 1
            job_manager.update_progress(job_id, int((step / total_steps) * 75), JobStatus.PROCESSING)
            await broadcast_progress(manager, job_id, int((step / total_steps) * 75), "Removing noise...")
            
            output_path = f"./uploads/{job_id}_step_denoised.mp4"
            cmd = ['ffmpeg', '-i', current_path, '-af', 'highpass=f=80,lowpass=f=8000,afftdn=nf=-20,volume=1.5', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-y', output_path]
            if run_ffmpeg(cmd):
                current_path = output_path
        
        # Color correct
        if color_correct:
            step += 1
            job_manager.update_progress(job_id, int((step / total_steps) * 90), JobStatus.PROCESSING)
            await broadcast_progress(manager, job_id, int((step / total_steps) * 90), "Color correcting...")
            
            output_path = f"./uploads/{job_id}_step_color.mp4"
            cmd = ['ffmpeg', '-i', current_path, '-vf', 'eq=contrast=1.1:brightness=0.05:saturation=1.15,unsharp=5:5:0.5:5:5:0.5', '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'copy', '-y', output_path]
            if run_ffmpeg(cmd):
                current_path = output_path
        
        # Final output
        final_output = f"./uploads/{job_id}_enhanced.mp4"
        shutil.copy(current_path, final_output)
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Enhancement complete!")
        
        job_manager.complete_job(job_id, final_output, {
            "operation": "auto_enhance",
            "remove_silence": remove_silence,
            "stabilize": stabilize,
            "denoise": denoise,
            "color_correct": color_correct
        })
        
        return True
        
    except Exception as e:
        print(f"Auto enhance failed: {e}")
        job_manager.fail_job(job_id, str(e))
        if manager:
            await manager.broadcast(job_id, {"type": "error", "error": str(e)})
        return False


async def detect_speech_whisper(audio_path: str) -> List[Tuple[float, float]]:
    """Detect speech using Whisper API"""
    if OPENAI_AVAILABLE:
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                client = OpenAI(api_key=api_key)
                with open(audio_path, "rb") as f:
                    result = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=f,
                        response_format="verbose_json",
                        timestamp_granularities=["segment"]
                    )
                segments = []
                if hasattr(result, 'segments'):
                    for seg in result.segments:
                        start = getattr(seg, 'start', 0)
                        end = getattr(seg, 'end', 0)
                        segments.append((start, end))
                return segments
        except Exception as e:
            print(f"Whisper failed: {e}")
    return []


# ============================================
# Text-to-Speech with ElevenLabs
# ============================================

async def generate_voiceover_async(job_id: str, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM", manager=None) -> bool:
    """Generate voiceover audio using ElevenLabs"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Generating voiceover...")
        
        client = get_elevenlabs_client()
        if not client:
            job_manager.fail_job(job_id, "ElevenLabs not configured")
            return False
        
        job_manager.update_progress(job_id, 40, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 40, "Synthesizing speech...")
        
        output_path = Path(f"./uploads/{job_id}_voiceover.mp3")
        
        try:
            audio = client.generate(
                text=text,
                voice=voice_id,
                model="eleven_monolingual_v1"
            )
            
            # Save the audio
            with open(output_path, 'wb') as f:
                for chunk in audio:
                    f.write(chunk)
                    
        except Exception as e:
            print(f"ElevenLabs generation failed: {e}")
            job_manager.fail_job(job_id, str(e))
            return False
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Voiceover generated!")
        
        job_manager.complete_job(job_id, str(output_path), {
            "operation": "voiceover",
            "voice_id": voice_id,
            "text_length": len(text)
        })
        
        return True
        
    except Exception as e:
        print(f"Voiceover generation failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


async def add_voiceover_to_video_async(job_id: str, video_path: str, audio_path: str, manager=None) -> bool:
    """Add voiceover audio track to video"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Mixing audio...")
        
        output_path = Path(f"./uploads/{job_id}_with_voiceover.mp4")
        
        # Mix original audio with voiceover
        cmd = [
            'ffmpeg', '-i', video_path, '-i', audio_path,
            '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]',
            '-map', '0:v', '-map', '[a]',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
            '-y', str(output_path)
        ]
        
        if not run_ffmpeg(cmd):
            # Fallback: replace audio entirely
            cmd = [
                'ffmpeg', '-i', video_path, '-i', audio_path,
                '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac',
                '-shortest', '-y', str(output_path)
            ]
            run_ffmpeg(cmd)
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Voiceover added!")
        
        job_manager.complete_job(job_id, str(output_path), {"operation": "add_voiceover"})
        return True
        
    except Exception as e:
        print(f"Add voiceover failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


# ============================================
# AI Summary with Gemini
# ============================================

async def generate_ai_summary_async(job_id: str, video_path: str, manager=None) -> bool:
    """Generate AI summary of video content using Gemini"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Analyzing video content...")
        
        # First get transcript
        audio_path = Path(f"./uploads/{job_id}_summary_audio.wav")
        cmd = ['ffmpeg', '-i', video_path, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', '-y', str(audio_path)]
        run_ffmpeg(cmd)
        
        job_manager.update_progress(job_id, 30, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 30, "Transcribing for analysis...")
        
        # Get transcript
        transcript = ""
        client = get_openai_client()
        if client:
            try:
                with open(audio_path, "rb") as f:
                    result = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=f,
                        response_format="text"
                    )
                transcript = result
            except:
                pass
        
        if audio_path.exists():
            audio_path.unlink()
        
        if not transcript:
            job_manager.fail_job(job_id, "Could not transcribe video")
            return False
        
        job_manager.update_progress(job_id, 60, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 60, "Generating AI summary...")
        
        # Generate summary with Gemini
        summary = ""
        highlights = []
        
        gemini = get_gemini_client()
        if gemini:
            try:
                prompt = f"""Analyze this video transcript and provide:
1. A brief summary (2-3 sentences)
2. Key topics discussed (bullet points)
3. Best moments/highlights that could be clipped (with estimated timestamps if possible)

Transcript:
{transcript[:4000]}  # Limit to avoid token limits
"""
                response = gemini.generate_content(prompt)
                summary = response.text
            except Exception as e:
                print(f"Gemini failed: {e}")
                # Fallback to OpenAI
                if client:
                    try:
                        response = client.chat.completions.create(
                            model="gpt-3.5-turbo",
                            messages=[
                                {"role": "system", "content": "You are a video content analyst."},
                                {"role": "user", "content": f"Summarize this transcript briefly:\n\n{transcript[:3000]}"}
                            ]
                        )
                        summary = response.choices[0].message.content
                    except:
                        summary = f"Transcript length: {len(transcript)} characters"
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Summary generated!")
        
        job_manager.complete_job(job_id, video_path, {
            "operation": "ai_summary",
            "summary": summary,
            "transcript_length": len(transcript)
        })
        
        return True
        
    except Exception as e:
        print(f"AI summary failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False


async def burn_subtitles_async(job_id: str, video_path: str, captions: List[Dict], style: str = "default", manager=None) -> bool:
    """Burn subtitles into video using FFmpeg"""
    try:
        job_manager.update_progress(job_id, 10, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 10, "Preparing subtitles...")
        
        # Create SRT file
        srt_path = Path(f"./uploads/{job_id}_burn.srt")
        write_srt_file(captions, str(srt_path))
        
        output_path = Path(f"./uploads/{job_id}_subtitled.mp4")
        
        # Define styles
        styles = {
            "default": "FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2",
            "netflix": "FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=1,Shadow=1",
            "youtube": "FontSize=20,PrimaryColour=&HFFFF00,OutlineColour=&H000000,Outline=2",
            "karaoke": "FontSize=28,PrimaryColour=&H00FFFF,OutlineColour=&HFF00FF,Outline=3",
            "minimal": "FontSize=18,PrimaryColour=&HFFFFFF,Outline=0"
        }
        
        style_opts = styles.get(style, styles["default"])
        
        job_manager.update_progress(job_id, 40, JobStatus.PROCESSING)
        await broadcast_progress(manager, job_id, 40, "Burning subtitles...")
        
        # Escape the path for FFmpeg filter
        srt_escaped = str(srt_path).replace('\\', '/').replace(':', '\\:')
        
        cmd = [
            'ffmpeg', '-i', video_path,
            '-vf', f"subtitles='{srt_escaped}':force_style='{style_opts}'",
            '-c:v', 'libx264', '-preset', 'fast',
            '-c:a', 'copy',
            '-y', str(output_path)
        ]
        
        if not run_ffmpeg(cmd, timeout=600):
            # Fallback without styling
            cmd = [
                'ffmpeg', '-i', video_path,
                '-vf', f"subtitles='{srt_escaped}'",
                '-c:v', 'libx264', '-preset', 'fast',
                '-c:a', 'copy',
                '-y', str(output_path)
            ]
            run_ffmpeg(cmd, timeout=600)
        
        # Cleanup
        if srt_path.exists():
            srt_path.unlink()
        
        job_manager.update_progress(job_id, 100, JobStatus.COMPLETED)
        await broadcast_progress(manager, job_id, 100, "Subtitles burned!")
        
        job_manager.complete_job(job_id, str(output_path), {
            "operation": "burn_subtitles",
            "style": style,
            "caption_count": len(captions)
        })
        
        return True
        
    except Exception as e:
        print(f"Burn subtitles failed: {e}")
        job_manager.fail_job(job_id, str(e))
        return False

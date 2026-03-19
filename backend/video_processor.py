"""
Video processing module for VoxCut
Handles multi-take detection, silence removal, and video assembly
"""
import cv2
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict
import subprocess
import json


class VideoProcessor:
    def __init__(self, video_path: str):
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    def detect_silence(self, audio_path: str, threshold: float = 0.02) -> List[Tuple[float, float]]:
        """
        Detect silent segments in the audio
        Returns list of (start_time, end_time) tuples for silent segments
        """
        # This would use librosa or similar in production
        # For MVP, return empty list (no silence removal)
        return []

    def detect_scene_changes(self, threshold: float = 30.0) -> List[float]:
        """
        Detect scene/cut changes in video using frame difference
        Returns list of frame numbers where scene changes occur
        """
        scene_changes = []
        prev_frame = None
        frame_num = 0

        while True:
            ret, frame = self.cap.read()
            if not ret:
                break

            if prev_frame is not None:
                # Calculate difference between frames
                diff = cv2.absdiff(prev_frame, frame)
                diff_mean = np.mean(diff)

                if diff_mean > threshold:
                    scene_changes.append(frame_num)

            prev_frame = frame.copy()
            frame_num += 1

        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        return scene_changes

    def extract_best_take(self) -> Tuple[int, int]:
        """
        Find the best take (longest continuous section with stable video)
        Returns (start_frame, end_frame)
        """
        # For MVP, return the entire video as one take
        return (0, self.frame_count)

    def stabilize_video(self, output_path: str) -> str:
        """
        Apply video stabilization using FFmpeg
        """
        try:
            # Use FFmpeg for stabilization
            cmd = [
                'ffmpeg',
                '-i', self.video_path,
                '-vf', 'vidstabdetect,vidstabtransform',
                '-c:v', 'libx264',
                '-preset', 'fast',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except subprocess.CalledProcessError:
            # If stabilization fails, copy original
            import shutil
            shutil.copy(self.video_path, output_path)
            return output_path

    def remove_silence(self, audio_path: str, output_path: str) -> str:
        """
        Remove silent segments from video using FFmpeg
        """
        try:
            cmd = [
                'ffmpeg',
                '-i', self.video_path,
                '-af', 'asilence=n=0.1:d=0.5',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except subprocess.CalledProcessError:
            import shutil
            shutil.copy(self.video_path, output_path)
            return output_path

    def get_metadata(self) -> Dict:
        """Get video metadata"""
        return {
            'fps': self.fps,
            'frame_count': self.frame_count,
            'duration': self.frame_count / self.fps,
            'width': self.width,
            'height': self.height,
        }

    def close(self):
        """Release video capture"""
        self.cap.release()


class AudioAnalyzer:
    """Analyze audio for speech detection and quality"""

    @staticmethod
    def extract_audio(video_path: str, output_path: str) -> str:
        """Extract audio from video"""
        try:
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-q:a', '9',
                '-n',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to extract audio: {e}")

    @staticmethod
    def detect_speech(audio_path: str) -> List[Tuple[float, float]]:
        """
        Detect speech segments in audio
        Returns list of (start_time, end_time) tuples
        """
        # In production, use Whisper or similar
        # For MVP, assume entire audio is speech
        return [(0, 999)]

    @staticmethod
    def normalize_audio(audio_path: str, output_path: str) -> str:
        """Normalize audio levels"""
        try:
            cmd = [
                'ffmpeg',
                '-i', audio_path,
                '-af', 'loudnorm',
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except subprocess.CalledProcessError:
            import shutil
            shutil.copy(audio_path, output_path)
            return output_path

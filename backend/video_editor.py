"""
Advanced video editing module for VoxCut
Handles video assembly, composition, and command-based edits
"""
import subprocess
from pathlib import Path
from typing import List, Tuple, Optional, Dict
import json
import tempfile
import os


class VideoSegment:
    """Represents a segment of video to be included in final edit"""

    def __init__(self, input_file: str, start_time: float = 0, end_time: Optional[float] = None):
        self.input_file = input_file
        self.start_time = start_time
        self.end_time = end_time
        self.filters: List[str] = []

    def add_filter(self, filter_str: str):
        """Add a filter to this segment"""
        self.filters.append(filter_str)

    def to_ffmpeg_input(self) -> Tuple[str, str]:
        """Convert to FFmpeg input format"""
        input_str = self.input_file
        trim_filter = f"trim=start={self.start_time}"
        if self.end_time:
            trim_filter += f":end={self.end_time}"

        all_filters = [trim_filter] + self.filters
        filter_str = ",".join(all_filters)

        return input_str, filter_str


class VideoEditor:
    """Handles complex video editing operations"""

    def __init__(self, video_path: str):
        self.video_path = video_path
        self.segments: List[VideoSegment] = []
        self.temp_dir = Path(tempfile.gettempdir()) / "voxcut"
        self.temp_dir.mkdir(exist_ok=True)

    def add_segment(self, start_time: float, end_time: Optional[float] = None) -> VideoSegment:
        """Add a segment from the video"""
        segment = VideoSegment(self.video_path, start_time, end_time)
        self.segments.append(segment)
        return segment

    def remove_segment(self, index: int):
        """Remove a segment by index"""
        if 0 <= index < len(self.segments):
            self.segments.pop(index)

    def clear_segments(self):
        """Clear all segments"""
        self.segments.clear()

    def speed_up(self, factor: float = 1.25):
        """Speed up video playback"""
        if factor <= 0:
            raise ValueError("Speed factor must be positive")

        for segment in self.segments:
            # FFmpeg setpts filter to speed up video and audio
            segment.add_filter(f"setpts=PTS/{factor}")
            segment.add_filter(f"atempo={factor}")

    def speed_down(self, factor: float = 0.8):
        """Slow down video playback"""
        self.speed_up(1 / factor)

    def add_zoom(self, scale: float = 1.2, duration: float = 1.0):
        """Add zoom effect to segments"""
        for segment in self.segments:
            # Zoom effect using scale interpolation
            segment.add_filter(f"scale=iw*{scale}:ih*{scale},crop=iw:ih")

    def add_fade_in(self, duration: float = 0.5):
        """Add fade-in effect to first segment"""
        if self.segments:
            self.segments[0].add_filter(f"fade=t=in:st=0:d={duration}")

    def add_fade_out(self, duration: float = 0.5):
        """Add fade-out effect to last segment"""
        if self.segments:
            self.segments[-1].add_filter(f"fade=t=out:st={self.get_duration()-duration}:d={duration}")

    def add_color_correction(self, brightness: float = 0, contrast: float = 1.0, saturation: float = 1.0):
        """Apply color correction to all segments"""
        for segment in self.segments:
            filter_str = f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}"
            segment.add_filter(filter_str)

    def add_text_overlay(self, text: str, position: str = "top", duration: float = 2.0):
        """Add text overlay to segments"""
        # position can be: top, bottom, center, topleft, topright, bottomleft, bottomright
        positions = {
            "top": "x=(w-text_w)/2:y=20",
            "bottom": "x=(w-text_w)/2:y=(h-text_h-20)",
            "center": "x=(w-text_w)/2:y=(h-text_h)/2",
            "topleft": "x=10:y=10",
            "topright": "x=(w-text_w-10):y=10",
            "bottomleft": "x=10:y=(h-text_h-10)",
            "bottomright": "x=(w-text_w-10):y=(h-text_h-10)",
        }

        pos = positions.get(position, positions["top"])
        text_filter = f"drawtext=text='{text}':{pos}:fontsize=24:fontcolor=white"

        if self.segments:
            self.segments[0].add_filter(text_filter)

    def concatenate(self, output_path: str, keep_audio: bool = True) -> str:
        """
        Concatenate segments into final video
        """
        if not self.segments:
            raise ValueError("No segments to concatenate")

        if len(self.segments) == 1:
            # For single segment, just copy with filters applied
            segment = self.segments[0]
            return self._apply_segment_filters(segment, output_path)

        # For multiple segments, use FFmpeg concat filter
        concat_file = self.temp_dir / "concat.txt"
        segment_files: List[str] = []

        # Generate intermediate files with filters applied
        for i, segment in enumerate(self.segments):
            output_segment = str(self.temp_dir / f"segment_{i}.mp4")
            self._apply_segment_filters(segment, output_segment)
            segment_files.append(output_segment)

        # Create concat file for FFmpeg
        with open(concat_file, "w") as f:
            for seg_file in segment_files:
                f.write(f"file '{seg_file}'\n")

        # Concatenate all segments
        try:
            cmd = [
                "ffmpeg",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",
                "-y",
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f"FFmpeg concat failed: {e}")

        # Cleanup intermediate files
        for seg_file in segment_files:
            try:
                Path(seg_file).unlink()
            except:
                pass

        return output_path

    def _apply_segment_filters(self, segment: VideoSegment, output_path: str) -> str:
        """Apply filters to a single segment"""
        input_file, filter_str = segment.to_ffmpeg_input()

        try:
            cmd = [
                "ffmpeg",
                "-i", input_file,
                "-vf", filter_str,
                "-c:a", "aac",
                "-b:a", "192k",
                "-y",
                output_path
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except subprocess.CalledProcessError as e:
            # Fallback: just copy the segment without filters
            import shutil
            shutil.copy(input_file, output_path)
            return output_path

    def get_duration(self) -> float:
        """Get total duration of all segments"""
        # This is approximate - real duration depends on playback speed
        try:
            cmd = [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1:noprint_wrappers=1",
                self.video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return float(result.stdout.strip())
        except:
            return 0.0

    def cleanup(self):
        """Clean up temporary files"""
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
        except:
            pass


class CommandInterpreter:
    """Interprets natural language commands for video editing"""

    def __init__(self, editor: VideoEditor):
        self.editor = editor
        self.commands_executed = []

    def execute(self, command: str) -> Dict[str, str]:
        """
        Execute a natural language command
        Returns status and result
        """
        command_lower = command.lower().strip()

        try:
            # Speed commands
            if "speed up" in command_lower or "faster" in command_lower:
                factor = self._extract_number(command, 1.25)
                self.editor.speed_up(factor)
                return {"status": "success", "command": f"Speed up by {factor}x"}

            if "slow down" in command_lower or "slower" in command_lower:
                factor = self._extract_number(command, 0.75)
                self.editor.speed_down(factor)
                return {"status": "success", "command": f"Slow down to {factor}x speed"}

            # Zoom commands
            if "zoom" in command_lower or "zoom in" in command_lower:
                zoom = self._extract_number(command, 1.2)
                self.editor.add_zoom(zoom)
                return {"status": "success", "command": f"Added zoom effect ({zoom}x)"}

            # Fade commands
            if "fade in" in command_lower:
                duration = self._extract_number(command, 0.5)
                self.editor.add_fade_in(duration)
                return {"status": "success", "command": f"Added fade in ({duration}s)"}

            if "fade out" in command_lower:
                duration = self._extract_number(command, 0.5)
                self.editor.add_fade_out(duration)
                return {"status": "success", "command": f"Added fade out ({duration}s)"}

            # Color commands
            if "brighten" in command_lower or "increase brightness" in command_lower:
                amount = self._extract_number(command, 0.2)
                self.editor.add_color_correction(brightness=amount)
                return {"status": "success", "command": f"Increased brightness by {amount}"}

            if "darken" in command_lower or "decrease brightness" in command_lower:
                amount = self._extract_number(command, -0.2)
                self.editor.add_color_correction(brightness=amount)
                return {"status": "success", "command": f"Decreased brightness by {abs(amount)}"}

            # Text commands
            if "add text" in command_lower or "caption" in command_lower:
                text = self._extract_text_content(command)
                self.editor.add_text_overlay(text)
                return {"status": "success", "command": f"Added text: '{text}'"}

            # Help command
            if command_lower in ["help", "commands", "?"]:
                return {
                    "status": "info",
                    "command": "Available commands: speed up/down, zoom, fade in/out, brighten/darken, add text"
                }

            return {"status": "unknown", "command": f"Unknown command: {command}"}

        except Exception as e:
            return {"status": "error", "command": str(e)}

    def _extract_number(self, text: str, default: float = 1.0) -> float:
        """Extract a number from command text"""
        import re
        numbers = re.findall(r'\d+\.?\d*', text)
        if numbers:
            return float(numbers[0])
        return default

    def _extract_text_content(self, text: str) -> str:
        """Extract text content from quotes in command"""
        import re
        matches = re.findall(r'"([^"]*)"', text)
        if matches:
            return matches[0]
        # Fallback: return text after "text" or "caption"
        if "text" in text.lower():
            return text.split("text", 1)[1].strip()
        return "Text"

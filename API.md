# VoxCut API Documentation

## Base URL
```
http://localhost:8000
```

## Authentication
Currently, no authentication is required for the MVP. This should be added for production deployment.

## Endpoints

### Health Check
**GET** `/`

Returns the API status and version.

```bash
curl http://localhost:8000/
```

Response:
```json
{
  "message": "VoxCut API",
  "version": "0.1.0"
}
```

---

### Upload Video
**POST** `/upload`

Upload a video file to start processing.

**Parameters:**
- `file` (FormData, required): Video file (MP4, WebM, MOV, AVI, MKV)

**Example:**
```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@video.mp4"
```

**Response:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "uploading"
}
```

---

### Get Job Status
**GET** `/job/{job_id}`

Get the current status and progress of a processing job.

**Parameters:**
- `job_id` (string, required): The job ID returned from upload

**Example:**
```bash
curl http://localhost:8000/job/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "created_at": "2024-03-19T10:30:00",
  "completed_at": null,
  "original_file": "./uploads/550e8400_original.mp4",
  "processed_file": null,
  "error": null,
  "metadata": {
    "original_duration": 120.5,
    "fps": 30,
    "scene_changes": 3
  },
  "commands_history": []
}
```

**Status Values:**
- `uploading` - File is being uploaded
- `queued` - Waiting to start processing
- `analyzing` - Analyzing video and audio
- `processing` - Running processing pipeline
- `editing` - Applying edits
- `rendering` - Rendering final video
- `completed` - Processing complete
- `failed` - Processing failed

---

### Start Auto-Edit
**POST** `/job/{job_id}/auto-edit`

Start the auto-editing process for an uploaded video.

**Parameters:**
- `job_id` (string, required): The job ID

**Example:**
```bash
curl -X POST http://localhost:8000/job/550e8400-e29b-41d4-a716-446655440000/auto-edit
```

**Response:**
```json
{
  "status": "processing",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Execute Command
**POST** `/job/{job_id}/command`

Execute an editing command on the video.

**Parameters:**
- `job_id` (string, required): The job ID
- Request body:
  ```json
  {
    "command": "speed up by 1.5x",
    "params": {}
  }
  ```

**Example:**
```bash
curl -X POST http://localhost:8000/job/550e8400-e29b-41d4-a716-446655440000/command \
  -H "Content-Type: application/json" \
  -d '{
    "command": "speed up by 1.5x",
    "params": {}
  }'
```

**Response:**
```json
{
  "status": "command_executed",
  "command": "Speed up by 1.5x",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Available Commands:**
- `speed up [by X]` - Speed up video (default: 1.25x)
- `slow down [to X]` - Slow down video (default: 0.75x)
- `zoom [by X]` - Add zoom effect (default: 1.2x)
- `fade in [duration X]` - Add fade in (default: 0.5s)
- `fade out [duration X]` - Add fade out (default: 0.5s)
- `brighten [by X]` - Increase brightness
- `darken [by X]` - Decrease brightness
- `add text "TEXT"` - Add text overlay

---

### Download Video
**GET** `/download/{job_id}`

Download the processed video file.

**Parameters:**
- `job_id` (string, required): The job ID

**Example:**
```bash
curl http://localhost:8000/download/550e8400-e29b-41d4-a716-446655440000 \
  --output processed_video.mp4
```

**Response:**
- Binary video file (MP4)

---

### List Jobs
**GET** `/jobs`

Get a list of all processing jobs.

**Example:**
```bash
curl http://localhost:8000/jobs
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "progress": 100,
      ...
    }
  ]
}
```

---

### Delete Job
**DELETE** `/job/{job_id}`

Delete a job and clean up its files.

**Parameters:**
- `job_id` (string, required): The job ID

**Example:**
```bash
curl -X DELETE http://localhost:8000/job/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "status": "deleted",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "status": "error"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (invalid parameters)
- `404` - Not found (job ID doesn't exist)
- `500` - Internal server error

---

## Rate Limiting

Currently, there is no rate limiting. This should be added for production.

---

## CORS

The API allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative frontend)

Configure in `backend/main.py` CORS middleware for production.

# Multi-stage build for VoxCut

# Stage 1: Build Frontend
FROM node:18-alpine as frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm run build

# Stage 2: Build Backend
FROM python:3.11-slim as backend-builder
WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Runtime
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create non-root user
RUN useradd -m -u 1000 voxcut && \
    mkdir -p /app/uploads /app/processed && \
    chown -R voxcut:voxcut /app

USER voxcut

# Expose port
EXPOSE 8000

# Start backend (frontend is served via nginx in production)
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

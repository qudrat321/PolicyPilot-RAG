# ==========================================
# PolicyPilot RAG - Production Multi-Stage Dockerfile
# Serves FastAPI Backend & Built React UI (<120MB RAM, Zero PyTorch)
# 100% Free Cloud Compliant (Render / Hugging Face Spaces / Koyeb)
# ==========================================

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_SUPABASE_URL=https://tfzatlcopjuhtcxvwyhy.supabase.co \
    VITE_SUPABASE_ANON_KEY=sb_publishable_Cl2sT5DuueLO6Ynf1vukQw_pg-DzK_w
RUN npm run build

# Stage 2: Ultra-lightweight Python Backend
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /build/dist ./frontend/dist

# Expose default ports (8000 for Render, 7860 for Hugging Face Spaces)
EXPOSE 8000 7860

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Launch uvicorn serving API and Static Frontend (single worker for minimal RAM footprint < 120MB)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --app-dir backend"]

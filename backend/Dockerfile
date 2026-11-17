# Multi-Platform Production Dockerfile for AutoMLens Backend
# Compatible with Hugging Face Spaces (16GB RAM free tier), Render, Railway, and local Docker

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install essential system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up non-root user matching Hugging Face Spaces requirements (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Install Python dependencies first for caching efficiency
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy backend application source code
COPY --chown=user:user . .

# Ensure runtime directories for artifacts and data exist with appropriate write permissions
RUN mkdir -p artifacts data

# Expose default port (7860 for Hugging Face Spaces, overridable via PORT env var)
EXPOSE 7860

# Launch Uvicorn server on dynamic port
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]

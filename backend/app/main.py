"""FastAPI Application Entry Point."""

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import (
    AutoMLensError,
    DatasetNotFoundError,
    FileSizeExceededError,
    ProfileNotFoundError,
    ProjectAlreadyExistsError,
    ProjectNotFoundError,
)
from app.core.logging import get_logger, setup_logging
from app.db.models import Base
from app.db.session import check_db_connection, engine

setup_logging()
logger = get_logger("main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle handler."""
    logger.info(
        "Starting %s v%s in %s mode",
        settings.PROJECT_NAME,
        settings.VERSION,
        settings.AUTOMLENS_ENV,
    )

    # Ensure runtime directories exist
    os.makedirs(settings.AUTOMLENS_ARTIFACT_DIR, exist_ok=True)
    os.makedirs("./data", exist_ok=True)

    # Initialize database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully.")
    except Exception as exc:
        logger.error("Failed to initialize database tables: %s", exc)

    yield

    logger.info("Shutting down %s", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)


@app.exception_handler(AutoMLensError)
async def automlens_exception_handler(_: Request, exc: AutoMLensError) -> JSONResponse:
    """Format domain exceptions to consistent JSON schema."""
    status_code = status.HTTP_400_BAD_REQUEST
    if isinstance(exc, ProjectNotFoundError | DatasetNotFoundError | ProfileNotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ProjectAlreadyExistsError):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(exc, FileSizeExceededError):
        status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE

    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """Format any unhandled exceptions to prevent dropped connections and CORS errors."""
    logger.exception("Unhandled internal server error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": f"Internal server error: {str(exc)}",
            }
        },
    )


# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    """Root route with API info and docs link."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }


@app.get(f"{settings.API_V1_STR}/health")
def health_check() -> dict:
    """System health check endpoint verifying database connectivity."""
    db_status = check_db_connection()
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": settings.AUTOMLENS_ENV,
        "database": db_status,
        "workers": settings.AUTOMLENS_MAX_WORKERS,
    }

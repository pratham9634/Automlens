"""FastAPI Application Entry Point."""

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import (
    AutoMLensError,
    DatabaseUnavailableError,
    DatasetNotFoundError,
    FileSizeExceededError,
    ProfileNotFoundError,
    ProjectAlreadyExistsError,
    ProjectNotFoundError,
)
from app.core.logging import get_logger, setup_logging
from app.db.models import Base
from app.db.session import check_db_connection, engine, migrate_schema

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
        migrate_schema(engine)
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
    elif isinstance(exc, DatabaseUnavailableError):
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Format FastAPI request validation errors into standard error schema."""
    errors: list[str] = []
    for err in exc.errors():
        loc = " -> ".join(str(item) for item in err.get("loc", []) if item != "body")
        msg = err.get("msg", "Invalid value")
        errors.append(f"{loc}: {msg}" if loc else msg)
    message = "; ".join(errors) if errors else "Request validation failed."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": message,
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Standardize HTTPException format to prevent schema divergence."""
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        content = exc.detail
    else:
        code = "HTTP_ERROR"
        if exc.status_code == 401:
            code = "UNAUTHORIZED"
        elif exc.status_code == 403:
            code = "FORBIDDEN"
        elif exc.status_code == 404:
            code = "NOT_FOUND"
        elif exc.status_code == 409:
            code = "CONFLICT"
        content = {
            "error": {
                "code": code,
                "message": str(exc.detail) if exc.detail else "An HTTP error occurred.",
            }
        }
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """Securely format unhandled exceptions without leaking credentials, SQL, or traces."""
    logger.exception("Unhandled internal server error: %s", exc)

    exc_type = type(exc).__name__.lower()
    exc_str = str(exc).lower()

    if "operationalerror" in exc_type or ("connection" in exc_str and "database" in exc_str):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": (
                        "Metadata database is currently unreachable. "
                        "Please check database connectivity."
                    ),
                }
            },
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": (
                    "An unexpected server error occurred. "
                    "Please try again or check the system logs."
                ),
            }
        },
    )


# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
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


@app.get("/docs", include_in_schema=False)
def docs_redirect() -> RedirectResponse:
    """Redirect root /docs to /api/v1/docs."""
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")


@app.get("/redoc", include_in_schema=False)
def redoc_redirect() -> RedirectResponse:
    """Redirect root /redoc to /api/v1/redoc."""
    return RedirectResponse(url=f"{settings.API_V1_STR}/redoc")


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

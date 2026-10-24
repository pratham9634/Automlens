"""Application Configuration using Pydantic Settings."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AutoMLens backend runtime settings."""

    # Application
    PROJECT_NAME: str = "AutoMLens API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    AUTOMLENS_ENV: str = "development"

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgrespassword@localhost:5433/automlens",
        description="SQLAlchemy database connection string",
    )
    AUTOMLENS_ALLOW_SQLITE_FALLBACK: bool = True

    # Multi-process parallelism
    AUTOMLENS_MAX_WORKERS: int = 4

    # Storage
    AUTOMLENS_ARTIFACT_DIR: str = "./artifacts"

    # Dataset limits
    AUTOMLENS_MAX_UPLOAD_MB: int = 50
    AUTOMLENS_MAX_ROWS: int = 100000
    AUTOMLENS_MAX_COLUMNS: int = 200

    # CORS
    AUTOMLENS_CORS_ORIGINS: str = "http://localhost:3000"

    # Logging
    AUTOMLENS_LOG_LEVEL: str = "INFO"

    # OpenRouter AI
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [
            origin.strip()
            for origin in self.AUTOMLENS_CORS_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Return cached singleton instance of application settings."""
    return Settings()

"""Database engine and session management with SQLAlchemy 2.0."""

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("db.session")
settings = get_settings()

Base = declarative_base()

# Initialize primary engine
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as exc:
    logger.warning("Failed to initialize PostgreSQL engine: %s", exc)
    if settings.AUTOMLENS_ALLOW_SQLITE_FALLBACK:
        logger.info("Falling back to local SQLite engine (data/automlens_fallback.db)")
        engine = create_engine(
            "sqlite:///./data/automlens_fallback.db",
            connect_args={"check_same_thread": False},
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    else:
        raise


def get_db() -> Generator:
    """Yield a database session and guarantee proper cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> dict:
    """Perform a ping to verify database responsiveness."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "dialect": engine.dialect.name,
        }
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return {
            "status": "unreachable",
            "error": str(exc),
        }

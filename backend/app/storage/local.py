"""Local filesystem implementation of the storage backend."""

import os
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import get_logger
from app.storage.base import StorageBackend

logger = get_logger("storage.local")
settings = get_settings()


class LocalStorageBackend(StorageBackend):
    """Stores project artifacts in the local filesystem under AUTOMLENS_ARTIFACT_DIR."""

    def __init__(self, base_dir: str | None = None):
        self.base_dir = Path(base_dir or settings.AUTOMLENS_ARTIFACT_DIR)
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_path(self, project_id: str, subfolder: str, filename: str) -> Path:
        """Construct and sanitize directory path within the project workspace."""
        target_dir = self.base_dir / project_id / subfolder
        os.makedirs(target_dir, exist_ok=True)
        return target_dir / filename

    def save_file(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
        content: bytes,
    ) -> str:
        """Write raw bytes to disk safely."""
        file_path = self._resolve_path(project_id, subfolder, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info("Saved artifact: %s", file_path)
        return str(file_path)

    def read_file(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> bytes:
        """Read binary content from disk."""
        file_path = self._resolve_path(project_id, subfolder, filename)
        if not file_path.exists():
            raise FileNotFoundError(f"Artifact not found: {file_path}")
        with open(file_path, "rb") as f:
            return f.read()

    def delete_file(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> bool:
        """Remove file from disk if present."""
        file_path = self._resolve_path(project_id, subfolder, filename)
        if file_path.exists():
            file_path.unlink()
            logger.info("Deleted artifact: %s", file_path)
            return True
        return False

    def get_path(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> str:
        """Get the absolute path to the artifact."""
        return str(self._resolve_path(project_id, subfolder, filename))

    def file_exists(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> bool:
        """Return True if artifact file exists on disk."""
        return self._resolve_path(project_id, subfolder, filename).exists()

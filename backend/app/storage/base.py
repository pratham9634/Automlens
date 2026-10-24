"""Abstract storage backend interface."""

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Abstract interface defining filesystem and artifact storage operations."""

    @abstractmethod
    def save_file(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
        content: bytes,
    ) -> str:
        """Save raw bytes to storage and return relative or absolute storage path."""
        pass

    @abstractmethod
    def read_file(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> bytes:
        """Read and return raw bytes from storage."""
        pass

    @abstractmethod
    def delete_file(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> bool:
        """Delete file from storage. Return True if deleted, False if not found."""
        pass

    @abstractmethod
    def get_path(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> str:
        """Return the concrete path or URI to the stored file."""
        pass

    @abstractmethod
    def file_exists(
        self,
        project_id: str,
        subfolder: str,
        filename: str,
    ) -> bool:
        """Check whether a file exists in storage."""
        pass

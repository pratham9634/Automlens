"""Domain exceptions and error mappings for AutoMLens."""

from fastapi import HTTPException, status


class AutoMLensError(Exception):
    """Base exception for all domain errors."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class ProjectNotFoundError(AutoMLensError):
    """Raised when a requested project does not exist."""

    def __init__(self, project_id: str):
        super().__init__(
            message=f"Project with ID '{project_id}' was not found.",
            code="PROJECT_NOT_FOUND",
        )


class ProjectAlreadyExistsError(AutoMLensError):
    """Raised when attempting to create a project with a duplicate name."""

    def __init__(self, name: str):
        super().__init__(
            message=f"Project with name '{name}' already exists.",
            code="PROJECT_ALREADY_EXISTS",
        )


class DatasetNotFoundError(AutoMLensError):
    """Raised when no active dataset exists for a project."""

    def __init__(self, project_id: str):
        super().__init__(
            message=f"No dataset found for project with ID '{project_id}'.",
            code="DATASET_NOT_FOUND",
        )


class InvalidFileFormatError(AutoMLensError):
    """Raised when an uploaded file format is not supported."""

    def __init__(self, filename: str):
        super().__init__(
            message=(
                f"File '{filename}' has an unsupported format. "
                "Only CSV (.csv) and Excel (.xlsx, .xls) are allowed."
            ),
            code="INVALID_FILE_FORMAT",
        )


class FileSizeExceededError(AutoMLensError):
    """Raised when an uploaded file exceeds the maximum size limit."""

    def __init__(self, size_mb: float, max_mb: int):
        super().__init__(
            message=f"File size ({size_mb:.2f} MB) exceeds maximum allowed limit of {max_mb} MB.",
            code="FILE_SIZE_EXCEEDED",
        )


class DatasetValidationError(AutoMLensError):
    """Raised when tabular data validation fails."""

    def __init__(self, reason: str):
        super().__init__(
            message=f"Dataset validation failed: {reason}",
            code="DATASET_VALIDATION_ERROR",
        )


def raise_http_error(exc: AutoMLensError, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
    """Helper to convert domain exception to structured HTTPException."""
    raise HTTPException(
        status_code=status_code,
        detail={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )

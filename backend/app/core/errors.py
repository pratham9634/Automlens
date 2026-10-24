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

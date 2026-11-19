"""Tests for secure and standardized API error responses."""

from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.main import app


def test_validation_error_standardized_format(client: TestClient) -> None:
    """Verify that Pydantic validation errors return structured schema matching AGENTS.md."""
    # Post empty JSON to project creation which requires 'name'
    res = client.post("/api/v1/projects", json={})
    assert res.status_code == 422
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    msg = data["error"]["message"].lower()
    assert "name" in msg or "required" in msg


def test_not_found_error_standardized_format(client: TestClient) -> None:
    """Verify that domain 404 errors return code and message."""
    res = client.get("/api/v1/projects/non-existent-uuid-12345")
    assert res.status_code == 404
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "PROJECT_NOT_FOUND"
    assert "non-existent-uuid-12345" in data["error"]["message"]


def test_generic_exception_does_not_leak_credentials() -> None:
    """Verify that unexpected server exceptions do not leak passwords or connection strings."""
    test_router = APIRouter()

    @test_router.get("/test-internal-leak")
    def trigger_sensitive_error():
        # Simulate a crash containing raw DB credentials
        raise RuntimeError(
            "OperationalError: connection to postgresql://postgres:SecretPass@"
            "aws-1.pooler.supabase.com:5432 failed"
        )

    app.include_router(test_router, prefix="/api/v1/test-security")

    with TestClient(app, raise_server_exceptions=False) as safe_client:
        res = safe_client.get("/api/v1/test-security/test-internal-leak")
        assert res.status_code in (500, 503)
        data = res.json()
        assert "error" in data
        assert data["error"]["code"] in ("INTERNAL_SERVER_ERROR", "DATABASE_UNAVAILABLE")

        # Critical security assertion: Credentials, passwords, or connection strings MUST NOT leak
        response_raw_text = res.text
        assert "SecretPass" not in response_raw_text
        assert "postgresql://" not in response_raw_text
        assert "aws-1.pooler.supabase.com" not in response_raw_text

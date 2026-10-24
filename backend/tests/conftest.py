"""Pytest shared fixtures."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Return a TestClient instance for API requests."""
    return TestClient(app)

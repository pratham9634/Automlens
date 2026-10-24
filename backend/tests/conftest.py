"""Pytest shared fixtures."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.db.models import Base
from app.db.session import engine
from app.main import app


@pytest.fixture(autouse=True, scope="session")
def setup_test_db() -> Generator[None, None, None]:
    """Ensure database tables exist before running test suite."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Return a TestClient instance managing the application lifespan."""
    with TestClient(app) as test_client:
        yield test_client

"""Tests for Audit Ledger recording, pagination, and filtering (Phase 9)."""

import uuid

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.services.audit import AuditService


def test_audit_event_recorded_on_project_creation(client: TestClient) -> None:
    """Verify that project creation automatically creates an audit event."""
    unique_name = f"AuditProject {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # Retrieve audit timeline
    timeline_res = client.get(f"/api/v1/projects/{project_id}/audit")
    assert timeline_res.status_code == 200

    data = timeline_res.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1

    first_event = data["items"][0]
    assert first_event["project_id"] == project_id
    assert first_event["action"] == "project_created"
    assert first_event["result"] == "success"
    assert "project_name" in first_event["evidence"]
    assert first_event["evidence"]["project_name"] == unique_name


def test_audit_timeline_pagination_and_filtering(client: TestClient) -> None:
    """Verify pagination and filtering by action / result in audit timeline."""
    unique_name = f"FilterProject {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # Add several custom events via service
    with SessionLocal() as db:
        service = AuditService(db)
        service.record_event(
            project_id=project_id,
            action="custom_action_1",
            reason="Test reason 1",
            result="success",
        )
        service.record_event(
            project_id=project_id,
            action="custom_action_2",
            reason="Test reason 2",
            result="warning",
        )
        service.record_event(
            project_id=project_id,
            action="custom_action_1",
            reason="Test reason 3",
            result="failure",
        )

    # Test filter by action
    action_res = client.get(f"/api/v1/projects/{project_id}/audit?action=custom_action_1")
    assert action_res.status_code == 200
    action_data = action_res.json()
    assert action_data["total"] == 2
    assert all(item["action"] == "custom_action_1" for item in action_data["items"])

    # Test filter by result
    result_res = client.get(f"/api/v1/projects/{project_id}/audit?result=warning")
    assert result_res.status_code == 200
    result_data = result_res.json()
    assert result_data["total"] == 1
    assert result_data["items"][0]["action"] == "custom_action_2"
    assert result_data["items"][0]["result"] == "warning"

    # Test pagination
    page_res = client.get(f"/api/v1/projects/{project_id}/audit?limit=2&skip=0")
    assert page_res.status_code == 200
    page_data = page_res.json()
    assert len(page_data["items"]) == 2
    assert page_data["limit"] == 2


def test_audit_nonexistent_project_returns_404(client: TestClient) -> None:
    """Verify that querying audit timeline for nonexistent project returns 404."""
    fake_id = str(uuid.uuid4())
    res = client.get(f"/api/v1/projects/{fake_id}/audit")
    assert res.status_code == 404


def test_audit_evidence_sanitization() -> None:
    """Verify that AuditService sanitizes secret keys in evidence dictionaries."""
    with SessionLocal() as db:
        service = AuditService(db)
        dirty_evidence = {
            "api_key": "sk-1234567890",
            "token": "secret_token_abc",
            "safe_metric": 0.95,
        }
        sanitized = service._sanitize_evidence(dirty_evidence)
        assert sanitized is not None
        assert sanitized["api_key"] == "[REDACTED]"
        assert sanitized["token"] == "[REDACTED]"
        assert sanitized["safe_metric"] == 0.95

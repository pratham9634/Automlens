"""Tests for Export Hub status inspection and artifact downloads (Phase 9)."""

import json
import uuid

from fastapi.testclient import TestClient


def test_get_export_status_overview(client: TestClient) -> None:
    """Verify that export status lists all 6 artifacts with correct availability."""
    unique_name = f"ExportStatus {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    status_res = client.get(f"/api/v1/projects/{project_id}/exports")
    assert status_res.status_code == 200
    data = status_res.json()

    assert data["project_id"] == project_id
    assert len(data["exports"]) == 6

    keys = [item["export_type"] for item in data["exports"]]
    assert "quality_report" in keys
    assert "leaderboard" in keys
    assert "predictions" in keys
    assert "manifest" in keys
    assert "pipeline" in keys
    assert "audit_log" in keys

    # audit_log should always be available
    audit_item = next(i for i in data["exports"] if i["export_type"] == "audit_log")
    assert audit_item["is_available"] is True


def test_download_audit_log_export(client: TestClient) -> None:
    """Verify that downloading the audit log returns valid JSON and records an audit event."""
    unique_name = f"AuditExport {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    download_res = client.get(f"/api/v1/projects/{project_id}/exports/audit_log")
    assert download_res.status_code == 200
    assert "application/json" in download_res.headers.get("content-type", "")
    assert "attachment;" in download_res.headers.get("content-disposition", "")
    assert "X-Artifact-Checksum-SHA256" in download_res.headers

    # Verify JSON structure
    payload = json.loads(download_res.text)
    assert "meta" in payload
    assert "events" in payload
    assert len(payload["events"]) >= 1


def test_download_unavailable_export_fails(client: TestClient) -> None:
    """Verify that attempting to download a missing report fails with an appropriate error."""
    unique_name = f"MissingExport {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # Quality report is not generated yet
    res = client.get(f"/api/v1/projects/{project_id}/exports/quality_report")
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "EXPORT_NOT_FOUND"


def test_download_invalid_export_type(client: TestClient) -> None:
    """Verify that requesting an unsupported export type returns 400 with INVALID_EXPORT_TYPE."""
    unique_name = f"InvalidExport {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    res = client.get(f"/api/v1/projects/{project_id}/exports/unsupported_type")
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_EXPORT_TYPE"

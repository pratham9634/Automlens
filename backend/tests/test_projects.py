"""Tests for Project CRUD endpoints and business logic."""

import uuid

from fastapi.testclient import TestClient


def test_create_project_success(client: TestClient) -> None:
    """Verify that a project can be created with valid payload."""
    unique_name = f"Project {uuid.uuid4().hex[:8]}"
    payload = {
        "name": unique_name,
        "description": "A test classification project.",
    }
    response = client.post("/api/v1/projects", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["name"] == unique_name
    assert data["description"] == "A test classification project."
    assert data["status"] == "created"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_duplicate_project_fails(client: TestClient) -> None:
    """Verify that creating two projects with the exact same name returns 409 Conflict."""
    unique_name = f"Project {uuid.uuid4().hex[:8]}"
    payload = {"name": unique_name}

    first = client.post("/api/v1/projects", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/projects", json=payload)
    assert second.status_code == 409
    error_data = second.json()
    assert "error" in error_data
    assert error_data["error"]["code"] == "PROJECT_ALREADY_EXISTS"


def test_create_project_validation_failure(client: TestClient) -> None:
    """Verify that short names or missing names fail with 422 Unprocessable Entity."""
    response = client.post("/api/v1/projects", json={"name": "A"})
    assert response.status_code == 422


def test_get_project_by_id(client: TestClient) -> None:
    """Verify that an existing project can be fetched by ID."""
    unique_name = f"Project {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/projects/{project_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id
    assert get_res.json()["name"] == unique_name


def test_get_nonexistent_project_returns_404(client: TestClient) -> None:
    """Verify that requesting an unknown project ID returns 404 Not Found."""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/projects/{fake_id}")
    assert response.status_code == 404
    error_data = response.json()
    assert error_data["error"]["code"] == "PROJECT_NOT_FOUND"


def test_list_projects(client: TestClient) -> None:
    """Verify that projects list endpoint returns items and total count."""
    unique_name = f"Project {uuid.uuid4().hex[:8]}"
    client.post("/api/v1/projects", json={"name": unique_name})

    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 1


def test_update_project(client: TestClient) -> None:
    """Verify that project metadata can be patched."""
    unique_name = f"Project {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    project_id = create_res.json()["id"]

    updated_name = f"Updated {uuid.uuid4().hex[:8]}"
    patch_res = client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": updated_name, "description": "New description"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == updated_name
    assert patch_res.json()["description"] == "New description"


def test_delete_project(client: TestClient) -> None:
    """Verify that deleting a project returns 204 and removes the project."""
    unique_name = f"Project {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    project_id = create_res.json()["id"]

    delete_res = client.delete(f"/api/v1/projects/{project_id}")
    assert delete_res.status_code == 204

    get_res = client.get(f"/api/v1/projects/{project_id}")
    assert get_res.status_code == 404


def test_reset_project_flow(client: TestClient) -> None:
    """Verify that resetting a project clears models while preserving uploaded dataset."""
    name = f"Reset Test {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": name})
    assert create_res.status_code == 201
    pid = create_res.json()["id"]

    # Load demo dataset
    demo_res = client.post(f"/api/v1/projects/{pid}/dataset/demo/titanic")
    assert demo_res.status_code == 201

    # Reset workspace
    reset_res = client.post(f"/api/v1/projects/{pid}/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "dataset_uploaded"


def test_clone_project_flow(client: TestClient) -> None:
    """Verify cloning duplicates the project and copies the active dataset."""
    name = f"Source Project {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": name})
    assert create_res.status_code == 201
    pid = create_res.json()["id"]

    # Load demo dataset
    demo_res = client.post(f"/api/v1/projects/{pid}/dataset/demo/titanic")
    assert demo_res.status_code == 201

    # Clone
    clone_res = client.post(f"/api/v1/projects/{pid}/clone")
    assert clone_res.status_code == 201
    cloned_data = clone_res.json()
    assert cloned_data["id"] != pid
    assert "(Copy)" in cloned_data["name"]
    assert cloned_data["status"] == "dataset_uploaded"

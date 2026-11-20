"""Tests for Dataset upload, validation, previews, and deletion."""

import io
import uuid

import pandas as pd
from fastapi.testclient import TestClient


def _create_test_project(client: TestClient) -> str:
    """Helper to create an isolated project workspace."""
    name = f"Test Project {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": name})
    assert res.status_code == 201
    return res.json()["id"]


def test_upload_csv_dataset_success(client: TestClient) -> None:
    """Verify that a valid tabular CSV can be uploaded, stored, and previewed."""
    project_id = _create_test_project(client)

    csv_content = (
        b"PassengerId,Survived,Pclass,Name,Sex,Age,Fare\n"
        b"1,0,3,Braund Mr. Owen Harris,male,22,7.25\n"
        b"2,1,1,Cumings Mrs. John Bradley,female,38,71.2833\n"
        b"3,1,3,Heikkinen Miss. Laina,female,26,7.925\n"
    )

    files = {"file": ("titanic_sample.csv", csv_content, "text/csv")}
    response = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert response.status_code == 201

    data = response.json()
    assert "dataset" in data
    assert "preview_rows" in data

    dataset = data["dataset"]
    assert dataset["filename"] == "titanic_sample.csv"
    assert dataset["row_count"] == 3
    assert dataset["column_count"] == 7
    assert len(dataset["sha256_hash"]) == 64
    assert len(data["preview_rows"]) == 3
    assert data["preview_rows"][0]["PassengerId"] == 1
    assert data["preview_rows"][0]["Sex"] == "male"

    # Verify project status updated
    project_res = client.get(f"/api/v1/projects/{project_id}")
    assert project_res.json()["status"] == "dataset_uploaded"


def test_upload_excel_dataset_success(client: TestClient) -> None:
    """Verify that a valid Excel file (.xlsx) can be uploaded and parsed."""
    project_id = _create_test_project(client)

    df = pd.DataFrame(
        {
            "FeatureA": [10, 20, 30],
            "FeatureB": ["Low", "Med", "High"],
            "Target": [0, 1, 0],
        }
    )
    excel_buffer = io.BytesIO()
    df.to_excel(excel_buffer, index=False, engine="openpyxl")
    excel_content = excel_buffer.getvalue()

    files = {
        "file": (
            "data.xlsx",
            excel_content,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }
    response = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert response.status_code == 201

    data = response.json()
    assert data["dataset"]["row_count"] == 3
    assert data["dataset"]["column_count"] == 3


def test_upload_invalid_file_format_rejected(client: TestClient) -> None:
    """Verify that non-tabular files (e.g. .txt, .pdf) are rejected."""
    project_id = _create_test_project(client)
    files = {"file": ("notes.txt", b"Hello world", "text/plain")}

    response = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert response.status_code == 400
    error_data = response.json()
    assert error_data["error"]["code"] == "INVALID_FILE_FORMAT"


def test_upload_empty_file_rejected(client: TestClient) -> None:
    """Verify that a 0-byte file is rejected with an actionable error."""
    project_id = _create_test_project(client)
    files = {"file": ("empty.csv", b"", "text/csv")}

    response = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert response.status_code == 400
    error_data = response.json()
    assert error_data["error"]["code"] == "DATASET_VALIDATION_ERROR"


def test_upload_empty_rows_dataframe_rejected(client: TestClient) -> None:
    """Verify that CSV with headers but 0 rows of data is rejected."""
    project_id = _create_test_project(client)
    files = {"file": ("headers_only.csv", b"ColA,ColB,ColC\n", "text/csv")}

    response = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert response.status_code == 400
    error_data = response.json()
    assert error_data["error"]["code"] == "DATASET_VALIDATION_ERROR"


def test_get_dataset_success(client: TestClient) -> None:
    """Verify fetching the active dataset metadata and preview rows."""
    project_id = _create_test_project(client)

    csv_content = b"A,B\n1,2\n3,4\n"
    files = {"file": ("sample.csv", csv_content, "text/csv")}
    client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)

    response = client.get(f"/api/v1/projects/{project_id}/dataset")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset"]["filename"] == "sample.csv"
    assert len(data["preview_rows"]) == 2


def test_get_dataset_not_found(client: TestClient) -> None:
    """Verify fetching dataset for a project with no uploaded dataset returns 404."""
    project_id = _create_test_project(client)
    response = client.get(f"/api/v1/projects/{project_id}/dataset")
    assert response.status_code == 404
    error_data = response.json()
    assert error_data["error"]["code"] == "DATASET_NOT_FOUND"


def test_delete_dataset_success(client: TestClient) -> None:
    """Verify deleting a dataset removes it and resets project status to 'created'."""
    project_id = _create_test_project(client)

    csv_content = b"A,B\n1,2\n"
    files = {"file": ("to_delete.csv", csv_content, "text/csv")}
    client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)

    delete_res = client.delete(f"/api/v1/projects/{project_id}/dataset")
    assert delete_res.status_code == 204

    get_res = client.get(f"/api/v1/projects/{project_id}/dataset")
    assert get_res.status_code == 404

    # Verify project status reverted
    project_res = client.get(f"/api/v1/projects/{project_id}")
    assert project_res.json()["status"] == "created"


def test_upload_semicolon_delimited_csv(client: TestClient) -> None:
    """Verify that European CSV with semicolon delimiters is automatically detected."""
    project_id = _create_test_project(client)
    csv_content = b"ColA;ColB;ColC\n10;20;30\n40;50;60\n"
    files = {"file": ("data_semicolon.csv", csv_content, "text/csv")}

    response = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["dataset"]["column_count"] == 3
    assert len(data["dataset"]["columns"]) == 3
    col_names = [c["name"] for c in data["dataset"]["columns"]]
    assert col_names == ["ColA", "ColB", "ColC"]


def test_upload_missing_sentinels_parsed_as_null(client: TestClient) -> None:
    """Verify that common null sentinels (?, NA, -999) are recognized as nulls."""
    project_id = _create_test_project(client)
    csv_content = b"NumA,CatB\n10,apple\n?,banana\n30,NA\n"
    files = {"file": ("sentinels.csv", csv_content, "text/csv")}

    response = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    cols = {c["name"]: c for c in data["dataset"]["columns"]}
    assert cols["NumA"]["null_count"] == 1
    assert cols["NumA"]["dtype"] == "numeric"
    assert cols["CatB"]["null_count"] == 1

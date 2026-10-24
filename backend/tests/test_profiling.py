"""Tests for Dataset Statistical Profiling, Correlation Analysis, and Data Quality."""

import uuid

from fastapi.testclient import TestClient


def _create_project_with_dataset(client: TestClient, csv_content: bytes) -> str:
    """Helper to create a project and upload a CSV dataset."""
    name = f"Profiling Test Project {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": name})
    assert res.status_code == 201
    project_id = res.json()["id"]

    files = {"file": ("test_dataset.csv", csv_content, "text/csv")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert upload_res.status_code == 201
    return project_id


def test_generate_profile_success(client: TestClient) -> None:
    """Verify full statistical profile generation on mixed dataset."""
    csv_data = (
        b"Id,Age,Salary,Department,Country\n"
        b"1,25,50000,Engineering,USA\n"
        b"2,30,65000,Engineering,USA\n"
        b"3,35,80000,Marketing,UK\n"
        b"4,40,95000,Marketing,UK\n"
        b"5,,110000,Sales,Germany\n"
        b"1,25,50000,Engineering,USA\n"  # duplicate row
    )
    project_id = _create_project_with_dataset(client, csv_data)

    # 1. Generate Profile
    response = client.post(f"/api/v1/projects/{project_id}/profile")
    assert response.status_code == 200

    profile = response.json()
    assert profile["project_id"] == project_id
    assert profile["total_rows"] == 6
    assert profile["total_columns"] == 5
    assert profile["duplicate_rows_count"] == 1
    assert profile["quality_score"] > 0

    # 2. Verify Numeric Columns
    num_names = [col["name"] for col in profile["numeric_columns"]]
    assert "Age" in num_names
    assert "Salary" in num_names

    salary_col = next(col for col in profile["numeric_columns"] if col["name"] == "Salary")
    assert salary_col["mean"] is not None
    assert salary_col["std"] is not None
    assert salary_col["min"] == 50000.0
    assert salary_col["max"] == 110000.0
    assert len(salary_col["histogram"]) > 0

    # 3. Verify Categorical Columns
    cat_names = [col["name"] for col in profile["categorical_columns"]]
    assert "Department" in cat_names
    dept_col = next(col for col in profile["categorical_columns"] if col["name"] == "Department")
    assert len(dept_col["top_categories"]) > 0
    assert any(c["value"] == "Engineering" for c in dept_col["top_categories"])

    # 4. Verify Duplicate Rows Warning
    warning_codes = [w["code"] for w in profile["warnings"]]
    assert "DUPLICATE_ROWS" in warning_codes

    # 5. Verify Correlation Matrix
    corr = profile["correlation_matrix"]
    assert corr is not None
    assert "Salary" in corr["columns"]
    assert len(corr["values"]) == len(corr["columns"])

    # 6. Verify Project Status updated
    proj_res = client.get(f"/api/v1/projects/{project_id}")
    assert proj_res.json()["status"] == "profiled"


def test_get_cached_profile(client: TestClient) -> None:
    """Verify reading persisted profile artifact from storage."""
    csv_data = b"A,B\n1,10\n2,20\n3,30\n"
    project_id = _create_project_with_dataset(client, csv_data)

    # Generate first
    post_res = client.post(f"/api/v1/projects/{project_id}/profile")
    assert post_res.status_code == 200

    # Get cached
    get_res = client.get(f"/api/v1/projects/{project_id}/profile")
    assert get_res.status_code == 200
    assert get_res.json()["total_rows"] == 3


def test_get_profile_not_found(client: TestClient) -> None:
    """Verify 404 when profile has not yet been computed."""
    csv_data = b"A,B\n1,10\n2,20\n"
    project_id = _create_project_with_dataset(client, csv_data)

    res = client.get(f"/api/v1/projects/{project_id}/profile")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "PROFILE_NOT_FOUND"


def test_generate_profile_no_dataset_fails(client: TestClient) -> None:
    """Verify 404 when trying to profile an empty project with no dataset."""
    name = f"Empty Project {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": name})
    project_id = res.json()["id"]

    profile_res = client.post(f"/api/v1/projects/{project_id}/profile")
    assert profile_res.status_code == 404
    assert profile_res.json()["error"]["code"] == "DATASET_NOT_FOUND"


def test_constant_column_and_iqr_outlier_warning(client: TestClient) -> None:
    """Verify detection of zero-variance constant features and IQR outlier flags."""
    # Column Const has 0 variance; Column Outlier has extreme value 5000
    csv_data = (
        b"Const,Val,Outlier\n"
        b"1,10,10\n"
        b"1,12,11\n"
        b"1,11,10\n"
        b"1,13,12\n"
        b"1,10,10\n"
        b"1,12,11\n"
        b"1,11,10\n"
        b"1,13,12\n"
        b"1,11,11\n"
        b"1,12,5000\n"  # Extreme outlier
    )
    project_id = _create_project_with_dataset(client, csv_data)

    res = client.post(f"/api/v1/projects/{project_id}/profile")
    assert res.status_code == 200

    profile = res.json()
    warnings = profile["warnings"]
    warning_codes = [w["code"] for w in warnings]

    assert "CONSTANT_COLUMN" in warning_codes
    assert "OUTLIERS_DETECTED" in warning_codes

    outlier_col = next(c for c in profile["numeric_columns"] if c["name"] == "Outlier")
    assert outlier_col["outlier_count"] >= 1
    # Check that data rows were NOT deleted
    assert profile["total_rows"] == 10


def test_high_correlation_warning(client: TestClient) -> None:
    """Verify high multicollinearity detection when two features have |r| >= 0.85."""
    # ColA and ColB are perfectly collinear (B = 2 * A)
    csv_data = (
        b"ColA,ColB,Independent\n"
        b"1,2,50\n"
        b"2,4,10\n"
        b"3,6,80\n"
        b"4,8,20\n"
        b"5,10,70\n"
        b"6,12,30\n"
    )
    project_id = _create_project_with_dataset(client, csv_data)

    res = client.post(f"/api/v1/projects/{project_id}/profile")
    assert res.status_code == 200

    profile = res.json()
    warning_codes = [w["code"] for w in profile["warnings"]]
    assert "HIGH_MULTICOLLINEARITY" in warning_codes

    corr_matrix = profile["correlation_matrix"]
    assert corr_matrix is not None
    assert len(corr_matrix["high_correlations"]) >= 1
    high_pair = corr_matrix["high_correlations"][0]
    assert high_pair["correlation"] >= 0.85


def test_boolean_column_profiling(client: TestClient) -> None:
    """Verify that boolean features are categorized as categorical without numpy lerp errors."""
    csv_data = (
        b"Id,Active,Flag\n"
        b"1,True,False\n"
        b"2,False,False\n"
        b"3,True,True\n"
        b"4,True,False\n"
        b"5,False,True\n"
    )
    project_id = _create_project_with_dataset(client, csv_data)

    res = client.post(f"/api/v1/projects/{project_id}/profile")
    assert res.status_code == 200

    profile = res.json()
    cat_names = [col["name"] for col in profile["categorical_columns"]]
    assert "Active" in cat_names
    assert "Flag" in cat_names

    num_names = [col["name"] for col in profile["numeric_columns"]]
    assert "Active" not in num_names
    assert "Flag" not in num_names

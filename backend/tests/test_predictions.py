"""Tests for Single and Batch Predictions, Confusion Matrix, and Artifact Export (Phase 6)."""

import time
import uuid

from fastapi.testclient import TestClient


def _create_trained_project(client: TestClient) -> tuple[str, str]:
    """Helper creating a trained project workspace ready for inference."""
    proj_name = f"Prediction Test {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": proj_name})
    assert res.status_code == 201
    project_id = res.json()["id"]

    # 25 rows with mixed types
    csv_rows = ["Age,Salary,Department,Target"]
    for i in range(25):
        target_val = i % 2
        dept = ["Engineering", "Product", "Sales"][i % 3]
        csv_rows.append(f"{20 + i},{40000 + i * 1500},{dept},{target_val}")
    csv_content = "\n".join(csv_rows).encode("utf-8")

    files = {"file": ("staff.csv", csv_content, "text/csv")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert upload_res.status_code == 201

    # Confirm target
    confirm_payload = {
        "target_column": "Target",
        "task_type": "binary_classification",
        "selected_models": ["dummy_classifier", "logistic_regression"],
        "primary_metric": "f1_macro",
    }
    confirm_res = client.post(f"/api/v1/projects/{project_id}/target/confirm", json=confirm_payload)
    assert confirm_res.status_code == 200

    # Start training
    start_res = client.post(f"/api/v1/projects/{project_id}/training/start")
    assert start_res.status_code == 202
    run_id = start_res.json()["run_id"]

    # Wait for completion
    for _ in range(20):
        time.sleep(0.5)
        run_res = client.get(f"/api/v1/runs/{run_id}")
        if run_res.status_code == 200 and run_res.json()["status"] == "completed":
            break

    return project_id, "logistic_regression"


def test_single_prediction_flow(client: TestClient) -> None:
    """Verify single-row prediction with confidence estimation and probability breakdown."""
    project_id, model_id = _create_trained_project(client)

    payload = {
        "inputs": {
            "Age": 28,
            "Salary": 52000,
            "Department": "Engineering",
        }
    }

    res = client.post(
        f"/api/v1/projects/{project_id}/models/{model_id}/predict/single",
        json=payload,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["model_id"] == model_id
    assert data["target_column"] == "Target"
    assert data["prediction"] in ("0", "1", 0, 1)
    assert data["probabilities"] is not None
    assert len(data["probabilities"]) == 2
    assert 0.0 <= data["confidence"] <= 1.0


def test_batch_prediction_flow(client: TestClient) -> None:
    """Verify batch CSV inference and export download."""
    project_id, model_id = _create_trained_project(client)

    batch_csv = b"Age,Salary,Department\n24,45000,Engineering\n32,65000,Sales\n40,85000,Product\n"

    files = {"file": ("unseen_batch.csv", batch_csv, "text/csv")}
    res = client.post(
        f"/api/v1/projects/{project_id}/models/{model_id}/predict/batch",
        files=files,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 3
    assert len(data["preview_rows"]) == 3
    assert "predicted_Target" in data["preview_rows"][0]
    assert "download_url" in data

    # Verify export download
    download_res = client.get(data["download_url"])
    assert download_res.status_code == 200
    assert "predicted_Target" in download_res.text


def test_confusion_matrix_endpoint(client: TestClient) -> None:
    """Verify confusion matrix computation on classification dataset."""
    project_id, model_id = _create_trained_project(client)

    res = client.get(
        f"/api/v1/projects/{project_id}/models/{model_id}/confusion-matrix",
    )
    assert res.status_code == 200
    data = res.json()
    assert "classes" in data
    assert len(data["classes"]) == 2
    assert "matrix" in data
    assert len(data["matrix"]) == 2
    assert 0.0 <= data["overall_accuracy"] <= 1.0
    assert len(data["per_class_metrics"]) == 2


def test_model_download_endpoint(client: TestClient) -> None:
    """Verify fitted pipeline .joblib artifact download."""
    project_id, model_id = _create_trained_project(client)

    res = client.get(
        f"/api/v1/projects/{project_id}/models/{model_id}/download",
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/octet-stream"
    assert len(res.content) > 100


def test_batch_validation_and_distribution_metrics(client: TestClient) -> None:
    """Verify pre-flight batch CSV validation and output distribution metrics."""
    project_id, model_id = _create_trained_project(client)

    # 1. Valid batch CSV
    valid_csv = b"Age,Salary,Department\n25,50000,Engineering\n35,70000,Sales\n"
    val_res = client.post(
        f"/api/v1/projects/{project_id}/models/{model_id}/predict/batch/validate",
        files={"file": ("valid.csv", valid_csv, "text/csv")},
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid"] is True
    assert val_data["total_rows"] == 2
    assert "Age" in val_data["matched_features"]
    assert len(val_data["missing_features"]) == 0

    # 2. Invalid batch CSV (missing 'Salary' column)
    invalid_csv = b"Age,Department\n25,Engineering\n35,Sales\n"
    inval_res = client.post(
        f"/api/v1/projects/{project_id}/models/{model_id}/predict/batch/validate",
        files={"file": ("invalid.csv", invalid_csv, "text/csv")},
    )
    assert inval_res.status_code == 200
    inval_data = inval_res.json()
    assert inval_data["valid"] is False
    assert "Salary" in inval_data["missing_features"]

    # 3. Batch prediction includes distribution_summary
    pred_res = client.post(
        f"/api/v1/projects/{project_id}/models/{model_id}/predict/batch",
        files={"file": ("valid.csv", valid_csv, "text/csv")},
    )
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert "distribution_summary" in pred_data
    dist = pred_data["distribution_summary"]
    assert dist["type"] == "classification"
    assert "class_counts" in dist
    assert "class_percentages" in dist


def test_sample_row_generation(client: TestClient) -> None:
    """Verify sample row helper returns median profile and random representative rows."""
    project_id, model_id = _create_trained_project(client)

    # Median typical profile
    res_med = client.get(
        f"/api/v1/projects/{project_id}/models/{model_id}/sample-row?sample_type=median"
    )
    assert res_med.status_code == 200
    med_data = res_med.json()
    assert med_data["sample_type"] == "median"
    assert "Age" in med_data["values"]
    assert "Salary" in med_data["values"]
    assert "Department" in med_data["values"]
    assert med_data["target_column"] == "Target"

    # Random real observation
    res_rand = client.get(
        f"/api/v1/projects/{project_id}/models/{model_id}/sample-row?sample_type=random"
    )
    assert res_rand.status_code == 200
    rand_data = res_rand.json()
    assert rand_data["sample_type"] == "random"
    assert "Age" in rand_data["values"]
    assert rand_data["target_value"] is not None


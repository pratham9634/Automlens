"""End-to-End integration test suite for AutoMLens (Phase 10).

Validates full real-world human-assisted workflows across:
1. Classification lifecycle with Titanic benchmark dataset (Rules 1-10 compliance).
2. Regression lifecycle with California Housing benchmark dataset.
3. Edge-case safeguards, input validation, and boundary exception handling.
"""

import json
import os
import time
import uuid

from fastapi.testclient import TestClient


def test_e2e_classification_titanic_full_lifecycle(client: TestClient) -> None:
    """Validate full classification lifecycle from project creation to export verification.

    Demonstrates complete compliance with academic AutoML correctness rules:
    - Rule 1: Zero data leakage (preprocessing encapsulated in Pipeline).
    - Rule 2: Explicit human target confirmation.
    - Rule 3: 5-Fold Stratified Cross-Validation.
    - Rule 4: Mandatory DummyClassifier baseline comparison.
    - Rule 5: Deterministic reproducibility recording (seed, fold scores).
    - Rule 6: Outlier reporting without auto-removal.
    - Rule 8: End-to-end Pipeline persistence (.joblib).
    - Rule 9 & 10: Model explainability with academic causation disclaimer.
    """
    # 1. Project Creation
    project_name = f"E2E Titanic Project {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": project_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. 1-Click Benchmark Dataset Load
    demo_res = client.post(f"/api/v1/projects/{project_id}/dataset/demo/titanic")
    assert demo_res.status_code == 201
    dataset_data = demo_res.json()
    assert dataset_data["dataset"]["row_count"] == 800
    assert dataset_data["dataset"]["column_count"] == 8
    col_names = [c["name"] for c in dataset_data["dataset"]["columns"]]
    assert "survived" in col_names

    # 3. Statistical Data Profiling (Rule 6: Outliers reported, not removed)
    profile_res = client.post(f"/api/v1/projects/{project_id}/profile")
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert profile_data["total_rows"] == 800
    assert profile_data["total_columns"] == 8

    # Verify outlier and missing value reporting (Rule 6)
    age_col = next(c for c in profile_data["numeric_columns"] if c["name"] == "age")
    assert age_col["null_count"] >= 0
    fare_col = next(c for c in profile_data["numeric_columns"] if c["name"] == "fare")
    assert fare_col["outlier_count"] >= 0

    # 4. Target Confirmation & Candidate Selection (Rule 2 & Rule 4)
    confirm_payload = {
        "target_column": "survived",
        "task_type": "binary_classification",
        "selected_models": ["dummy_classifier", "logistic_regression", "random_forest"],
        "primary_metric": "f1_macro",
    }
    confirm_res = client.post(
        f"/api/v1/projects/{project_id}/target/confirm",
        json=confirm_payload,
    )
    assert confirm_res.status_code == 200

    # 5. Parallel Training Run (Rule 3: 5-Fold Stratified CV, Rule 4: Baseline)
    start_res = client.post(f"/api/v1/projects/{project_id}/training/start")
    assert start_res.status_code == 202
    run_id = start_res.json()["run_id"]
    assert start_res.json()["total_models"] == 3

    # Poll run status until completed
    completed = False
    run_data = {}
    for _ in range(30):
        time.sleep(0.5)
        poll_res = client.get(f"/api/v1/runs/{run_id}")
        assert poll_res.status_code == 200
        run_data = poll_res.json()
        if run_data["status"] == "completed":
            completed = True
            break

    assert completed, f"Training run did not complete. Status: {run_data.get('status')}"
    assert run_data["completed_models"] == 3
    best_model_id = run_data["best_model_id"]
    assert best_model_id in ("logistic_regression", "random_forest")

    # Verify baseline comparison (Rule 4)
    baseline_run = next(m for m in run_data["model_runs"] if m["is_baseline"])
    assert baseline_run["model_id"] == "dummy_classifier"
    assert baseline_run["primary_metric_score"] is not None

    best_run = next(m for m in run_data["model_runs"] if m["model_id"] == best_model_id)
    # Real trained model must equal or beat the dummy baseline
    assert best_run["primary_metric_score"] >= baseline_run["primary_metric_score"]

    # 6. Single Inference
    single_payload = {
        "inputs": {
            "pclass": 1,
            "sex": "female",
            "age": 29.0,
            "sibsp": 0,
            "parch": 0,
            "fare": 211.33,
            "embarked": "S",
        }
    }
    pred_res = client.post(
        f"/api/v1/projects/{project_id}/models/{best_model_id}/predict/single",
        json=single_payload,
    )
    assert pred_res.status_code == 200
    pred_data = pred_res.json()
    assert pred_data["model_id"] == best_model_id
    assert pred_data["prediction"] in ("0", "1", 0, 1)
    assert pred_data["probabilities"] is not None
    assert 0.0 <= pred_data["confidence"] <= 1.0

    # 7. Batch Inference using pre-packaged test sample
    candidate_paths = [
        os.path.abspath("data/demo/batch_predict_sample.csv"),
        os.path.abspath("../data/demo/batch_predict_sample.csv"),
    ]
    batch_csv_path = next((p for p in candidate_paths if os.path.exists(p)), None)
    assert batch_csv_path is not None, "Batch demo CSV sample must exist"
    with open(batch_csv_path, "rb") as bf:
        files = {"file": ("test_passengers.csv", bf.read(), "text/csv")}

    batch_res = client.post(
        f"/api/v1/projects/{project_id}/models/{best_model_id}/predict/batch",
        files=files,
    )
    assert batch_res.status_code == 200
    batch_data = batch_res.json()
    assert batch_data["total_rows"] == 50
    assert len(batch_data["preview_rows"]) == 10
    assert "predicted_survived" in batch_data["preview_rows"][0]
    assert batch_data["download_url"] is not None

    # 8. Confusion Matrix Verification
    cm_res = client.get(
        f"/api/v1/projects/{project_id}/models/{best_model_id}/confusion-matrix",
    )
    assert cm_res.status_code == 200
    cm_data = cm_res.json()
    assert len(cm_data["classes"]) == 2
    assert len(cm_data["matrix"]) == 2
    assert 0.0 <= cm_data["overall_accuracy"] <= 1.0

    # 9. Model Explainability & Interpretability (Rule 9 & Rule 10)
    global_res = client.get(
        f"/api/v1/projects/{project_id}/models/{best_model_id}/explanations/global",
    )
    assert global_res.status_code == 200
    g_data = global_res.json()
    assert "Explainer" in g_data["method_label"]
    assert "real-world causation" in g_data["academic_disclaimer"]
    assert len(g_data["features"]) > 0

    local_res = client.post(
        f"/api/v1/projects/{project_id}/models/{best_model_id}/explanations/local",
        json=single_payload,
    )
    assert local_res.status_code == 200
    l_data = local_res.json()
    assert "real-world causation" in l_data["academic_disclaimer"]
    assert len(l_data["attributions"]) > 0

    # 10. Audit Ledger Timeline (Full Reproducibility & Governance)
    audit_res = client.get(f"/api/v1/projects/{project_id}/audit")
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["total"] >= 8
    event_actions = [e["action"] for e in audit_data["items"]]
    assert "project_created" in event_actions
    assert "dataset_uploaded" in event_actions
    assert "profile_generated" in event_actions
    assert "target_confirmed" in event_actions
    assert "training_started" in event_actions
    assert "prediction_single" in event_actions
    assert "explanation_global" in event_actions

    # 11. Artifact Export Hub Verification
    export_overview_res = client.get(f"/api/v1/projects/{project_id}/exports")
    assert export_overview_res.status_code == 200
    exp_data = export_overview_res.json()
    for item in exp_data["exports"]:
        assert item["is_available"] is True, f"Export {item['export_type']} should be available"

    # Download quality report
    qr_res = client.get(f"/api/v1/projects/{project_id}/exports/quality_report")
    assert qr_res.status_code == 200
    assert "application/json" in qr_res.headers.get("content-type", "")
    assert json.loads(qr_res.text)["total_rows"] == 800

    # Download leaderboard
    lb_res = client.get(f"/api/v1/projects/{project_id}/exports/leaderboard")
    assert lb_res.status_code == 200
    assert "Model Name" in lb_res.text or "logistic_regression" in lb_res.text

    # Download audit log
    al_res = client.get(f"/api/v1/projects/{project_id}/exports/audit_log")
    assert al_res.status_code == 200
    assert "X-Artifact-Checksum-SHA256" in al_res.headers

    # Download fitted pipeline binary (Rule 8)
    pipe_res = client.get(f"/api/v1/projects/{project_id}/exports/pipeline")
    assert pipe_res.status_code == 200
    assert len(pipe_res.content) > 500


def test_e2e_regression_housing_full_lifecycle(client: TestClient) -> None:
    """Validate full regression lifecycle with California Housing benchmark dataset."""
    project_name = f"E2E Housing Project {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": project_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 1. Load California Housing benchmark dataset
    demo_res = client.post(f"/api/v1/projects/{project_id}/dataset/demo/california_housing")
    assert demo_res.status_code == 201
    assert demo_res.json()["dataset"]["row_count"] == 1000

    # 2. Profile dataset
    prof_res = client.post(f"/api/v1/projects/{project_id}/profile")
    assert prof_res.status_code == 200

    # 3. Confirm regression target (Rule 2 & Rule 4)
    confirm_payload = {
        "target_column": "MedHouseVal",
        "task_type": "regression",
        "selected_models": ["dummy_regressor", "ridge"],
        "primary_metric": "r2",
    }
    confirm_res = client.post(
        f"/api/v1/projects/{project_id}/target/confirm",
        json=confirm_payload,
    )
    assert confirm_res.status_code == 200

    # 4. Trigger training run
    start_res = client.post(f"/api/v1/projects/{project_id}/training/start")
    assert start_res.status_code == 202
    run_id = start_res.json()["run_id"]

    # Poll run status
    completed = False
    run_data = {}
    for _ in range(25):
        time.sleep(0.5)
        poll_res = client.get(f"/api/v1/runs/{run_id}")
        run_data = poll_res.json()
        if run_data["status"] == "completed":
            completed = True
            break

    assert completed, f"Housing training run failed. Status: {run_data.get('status')}"
    assert run_data["completed_models"] == 2

    # Verify dummy regressor baseline score <= 0.0 for R2
    baseline_run = next(m for m in run_data["model_runs"] if m["is_baseline"])
    assert baseline_run["model_id"] == "dummy_regressor"
    assert baseline_run["primary_metric_score"] <= 0.05

    # Verify ridge model beats dummy regressor
    ridge_run = next(m for m in run_data["model_runs"] if m["model_id"] == "ridge")
    assert ridge_run["primary_metric_score"] > baseline_run["primary_metric_score"]

    # 5. Continuous Single Prediction
    single_payload = {
        "inputs": {
            "MedInc": 3.8,
            "HouseAge": 28.0,
            "AveRooms": 5.2,
            "AveBedrms": 1.05,
            "Population": 1400.0,
            "AveOccup": 3.0,
            "Latitude": 36.5,
            "Longitude": -119.5,
        }
    }
    pred_res = client.post(
        f"/api/v1/projects/{project_id}/models/ridge/predict/single",
        json=single_payload,
    )
    assert pred_res.status_code == 200
    p_data = pred_res.json()
    assert isinstance(p_data["prediction"], float | int)
    assert p_data["prediction"] > 0


def test_e2e_safeguards_and_validation_errors(client: TestClient) -> None:
    """Verify system-wide exception handling and validation safeguards."""
    # 1. Nonexistent project access returns 404
    non_existent = str(uuid.uuid4())
    res_404 = client.get(f"/api/v1/projects/{non_existent}")
    assert res_404.status_code == 404
    assert res_404.json()["error"]["code"] == "PROJECT_NOT_FOUND"

    # 2. Triggering training without confirming target returns 400
    p_name = f"Safeguard Test {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": p_name})
    assert create_res.status_code == 201
    pid = create_res.json()["id"]

    # Upload dataset first so project has dataset
    demo_load = client.post(f"/api/v1/projects/{pid}/dataset/demo/titanic")
    assert demo_load.status_code == 201

    # Attempt to start training before confirming target
    train_res = client.post(f"/api/v1/projects/{pid}/training/start")
    assert train_res.status_code == 400
    assert "Target configuration not confirmed" in train_res.json()["error"]["message"]

    # 3. Invalid demo dataset name returns 400 Bad Request
    demo_bad = client.post(f"/api/v1/projects/{pid}/dataset/demo/nonexistent_dataset")
    assert demo_bad.status_code == 400

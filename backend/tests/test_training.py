"""Tests for Parallel Multi-Model Training Engine, 5-Fold CV, and Baseline Compliance (Phase 5)."""

import os
import time
import uuid

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.ml.metrics import (
    aggregate_cv_metrics,
    compute_classification_metrics,
)
from app.ml.pipeline_factory import create_pipeline, get_estimator
from app.ml.task_detection import TaskType


def test_pipeline_factory_dummy_baseline_rule_4() -> None:
    """Verify Rule 4 compliance: Dummy Classifier and Regressor baseline estimators."""
    clf_dummy = get_estimator("dummy_classifier", TaskType.BINARY_CLASSIFICATION)
    assert clf_dummy.strategy == "most_frequent"

    reg_dummy = get_estimator("dummy_regressor", TaskType.REGRESSION)
    assert reg_dummy.strategy == "mean"


def test_pipeline_factory_leakage_free_execution() -> None:
    """Verify Rule 1 zero-leakage: Pipeline encapsulates ColumnTransformer and Model."""
    df = pd.DataFrame(
        {
            "num1": [1.0, 2.0, np.nan, 4.0, 5.0, 6.0],
            "cat1": ["A", "B", "A", None, "B", "A"],
            "target": [0, 1, 0, 1, 0, 1],
        }
    )

    X = df[["num1", "cat1"]]
    y = df["target"]

    pipe = create_pipeline(
        model_id="logistic_regression",
        task_type=TaskType.BINARY_CLASSIFICATION,
        numeric_cols=["num1"],
        categorical_cols=["cat1"],
    )

    # Fitting must succeed without error and handle missing values inside the pipeline
    pipe.fit(X, y)
    preds = pipe.predict(X)
    assert len(preds) == len(df)


def test_metrics_computation_and_aggregation() -> None:
    """Verify metric calculations and mean ± std aggregation across folds."""
    y_true = np.array([0, 1, 0, 1, 1])
    y_pred = np.array([0, 1, 0, 0, 1])
    y_prob = np.array([[0.8, 0.2], [0.1, 0.9], [0.7, 0.3], [0.6, 0.4], [0.2, 0.8]])

    metrics = compute_classification_metrics(y_true, y_pred, y_prob)
    assert "accuracy" in metrics
    assert "f1_macro" in metrics
    assert "roc_auc" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0

    # Aggregation across 3 mock folds
    fold_results = [
        {"f1_macro": 0.80, "accuracy": 0.82},
        {"f1_macro": 0.85, "accuracy": 0.86},
        {"f1_macro": 0.90, "accuracy": 0.90},
    ]
    aggregated = aggregate_cv_metrics(fold_results, primary_metric="f1_macro")
    assert aggregated["f1_macro"]["mean"] == 0.85
    assert aggregated["f1_macro"]["std"] > 0
    assert len(aggregated["f1_macro"]["folds"]) == 3


def test_training_flow_end_to_end(client: TestClient) -> None:
    """Integration test verifying full parallel training, joblib persistence, and leaderboard."""
    # 1. Create project
    proj_name = f"Training Integration Test {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": proj_name})
    assert res.status_code == 201
    project_id = res.json()["id"]

    # 2. Upload tabular data (sufficient rows for 5-fold CV)
    csv_rows = ["Age,Salary,Department,Target"]
    for i in range(25):
        target_val = i % 2
        dept = ["Engineering", "Product", "Sales"][i % 3]
        csv_rows.append(f"{20 + i},{40000 + i * 1500},{dept},{target_val}")
    csv_content = "\n".join(csv_rows).encode("utf-8")

    files = {"file": ("staff.csv", csv_content, "text/csv")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert upload_res.status_code == 201

    # 3. Confirm target configuration (locking Dummy baseline + real model)
    confirm_payload = {
        "target_column": "Target",
        "task_type": "binary_classification",
        "selected_models": ["dummy_classifier", "logistic_regression"],
        "primary_metric": "f1_macro",
    }
    confirm_res = client.post(f"/api/v1/projects/{project_id}/target/confirm", json=confirm_payload)
    assert confirm_res.status_code == 200

    # 4. Trigger background training run
    start_res = client.post(f"/api/v1/projects/{project_id}/training/start")
    assert start_res.status_code == 202
    run_id = start_res.json()["run_id"]
    assert run_id is not None
    assert start_res.json()["total_models"] == 2

    # 5. Poll run status until completion (max 10 seconds)
    completed = False
    for _ in range(20):
        time.sleep(0.5)
        run_res = client.get(f"/api/v1/runs/{run_id}")
        assert run_res.status_code == 200
        run_data = run_res.json()
        if run_data["status"] == "completed":
            completed = True
            break

    assert completed, f"Training run did not complete in time. Last status: {run_data['status']}"
    assert run_data["completed_models"] == 2
    assert run_data["best_model_id"] is not None
    assert run_data["best_score"] is not None

    # Verify model runs
    assert len(run_data["model_runs"]) == 2
    baseline_run = next(m for m in run_data["model_runs"] if m["is_baseline"])
    assert baseline_run["model_id"] == "dummy_classifier"
    assert baseline_run["status"] == "completed"
    assert baseline_run["primary_metric_score"] is not None
    assert baseline_run["primary_metric_std"] is not None
    assert baseline_run["artifact_path"] is not None

    # Verify Rule 8: Persisted Joblib file exists on disk
    assert os.path.exists(baseline_run["artifact_path"])

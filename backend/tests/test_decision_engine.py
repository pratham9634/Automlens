"""Tests for Task Detection, Target Selection, and Hybrid AI Decision Engine."""

import uuid

from fastapi.testclient import TestClient


def _create_project_with_dataset(client: TestClient, csv_content: bytes) -> str:
    """Helper to initialize project workspace with tabular data."""
    name = f"Decision Engine Test {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": name})
    assert res.status_code == 201
    project_id = res.json()["id"]

    files = {"file": ("titanic.csv", csv_content, "text/csv")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert upload_res.status_code == 201
    return project_id


def test_target_suggestion_heuristics(client: TestClient) -> None:
    """Verify automated target column and task type suggestion."""
    csv_data = (
        b"PassengerId,Pclass,Age,Fare,Survived\n"
        b"1,3,22.0,7.25,0\n"
        b"2,1,38.0,71.28,1\n"
        b"3,3,26.0,7.92,1\n"
        b"4,1,35.0,53.10,0\n"
    )
    project_id = _create_project_with_dataset(client, csv_data)

    res = client.get(f"/api/v1/projects/{project_id}/target/suggest")
    assert res.status_code == 200

    data = res.json()
    assert data["recommended_target"] == "Survived"

    survived_item = next(s for s in data["suggestions"] if s["name"] == "Survived")
    assert survived_item["inferred_task"] == "binary_classification"
    assert survived_item["distinct_count"] == 2
    assert survived_item["is_recommended"] is True


def test_decision_engine_binary_classification(client: TestClient) -> None:
    """Verify preprocessing strategy and Rule 4 baseline for binary classification."""
    csv_data = (
        b"Age,Salary,Category,Survived\n"
        b"22.0,50000,A,0\n"
        b"38.0,80000,B,1\n"
        b"26.0,60000,A,1\n"
        b"35.0,75000,C,0\n"
        b",90000,B,1\n"
    )
    project_id = _create_project_with_dataset(client, csv_data)

    payload = {"target_column": "Survived"}
    res = client.post(f"/api/v1/projects/{project_id}/decision", json=payload)
    assert res.status_code == 200

    data = res.json()
    assert data["target_column"] == "Survived"
    assert data["task_type"] == "binary_classification"
    assert data["primary_metric"] == "f1_macro"

    # Rule 4: Verify mandatory Dummy Baseline inclusion
    baseline_models = [m for m in data["candidate_models"] if m["is_baseline"]]
    assert len(baseline_models) == 1
    assert "Dummy" in baseline_models[0]["name"]

    # Verify real estimators are also suggested
    real_models = [m for m in data["candidate_models"] if not m["is_baseline"]]
    assert len(real_models) >= 3

    # Verify preprocessing decisions exist
    assert len(data["preprocessing_steps"]) > 0
    assert any(s["step_type"] == "imputation" for s in data["preprocessing_steps"])

    # Verify engineering rationale
    assert len(data["engineering_rationale"]) > 50


def test_decision_engine_regression(client: TestClient) -> None:
    """Verify regression task handling with DummyRegressor mean baseline."""
    csv_data = (
        b"Area,Bedrooms,Price\n1200,2,250000.0\n1800,3,380000.0\n2400,4,520000.0\n3000,5,690000.0\n"
    )
    project_id = _create_project_with_dataset(client, csv_data)

    payload = {"target_column": "Price"}
    res = client.post(f"/api/v1/projects/{project_id}/decision", json=payload)
    assert res.status_code == 200

    data = res.json()
    assert data["task_type"] == "regression"
    assert data["primary_metric"] == "r2"

    # Rule 4: Dummy Regressor mean baseline
    baseline = next(m for m in data["candidate_models"] if m["is_baseline"])
    assert "Dummy" in baseline["name"]
    assert "Regressor" in baseline["name"]


def test_human_task_override_rule_2(client: TestClient) -> None:
    """Rule 2: Task detection is a suggestion; user can explicitly override task type."""
    csv_data = b"Score,TargetInt\n10,1\n20,2\n30,3\n"
    project_id = _create_project_with_dataset(client, csv_data)

    # Heuristic suggests multiclass for integers 1,2,3; user overrides to regression
    payload = {
        "target_column": "TargetInt",
        "override_task_type": "regression",
    }
    res = client.post(f"/api/v1/projects/{project_id}/decision", json=payload)
    assert res.status_code == 200

    data = res.json()
    assert data["task_type"] == "regression"
    assert data["primary_metric"] == "r2"


def test_confirm_target_and_lock(client: TestClient) -> None:
    """Verify target confirmation, model locking, and project status advancement."""
    csv_data = b"FeatureA,Outcome\n10,Yes\n20,No\n"
    project_id = _create_project_with_dataset(client, csv_data)

    confirm_payload = {
        "target_column": "Outcome",
        "task_type": "binary_classification",
        "selected_models": ["dummy_classifier", "logistic_regression"],
        "primary_metric": "f1_macro",
    }

    post_res = client.post(f"/api/v1/projects/{project_id}/target/confirm", json=confirm_payload)
    assert post_res.status_code == 200

    confirmed = post_res.json()
    assert confirmed["project_id"] == project_id
    assert confirmed["target_column"] == "Outcome"
    assert confirmed["status"] == "target_confirmed"
    assert len(confirmed["selected_models"]) == 2

    # Verify project status in database updated
    proj_res = client.get(f"/api/v1/projects/{project_id}")
    assert proj_res.json()["status"] == "target_confirmed"

    # Verify GET returns the persisted confirmed config
    get_res = client.get(f"/api/v1/projects/{project_id}/target/confirm")
    assert get_res.status_code == 200
    assert get_res.json()["target_column"] == "Outcome"

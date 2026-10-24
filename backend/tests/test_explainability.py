"""Tests for Model Explainability & Interpretability (Phase 7).

Verifies:
- Global feature importance & downsampled SHAP values (Rule 9).
- Single-observation local SHAP attribution (Waterfall / Force).
- Rule 10 academic causation disclaimer on all outputs.
- TreeExplainer and LinearExplainer support.
"""

import time
import uuid

from fastapi.testclient import TestClient


def _create_trained_project_with_models(
    client: TestClient, models: list[str]
) -> tuple[str, str]:
    """Helper creating a trained project workspace with specified candidate models."""
    proj_name = f"Explainability Test {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": proj_name})
    assert res.status_code == 201
    project_id = res.json()["id"]

    # 30 rows with mixed types
    csv_rows = ["Age,Salary,Department,Target"]
    for i in range(30):
        target_val = i % 2
        dept = ["Engineering", "Product", "Sales"][i % 3]
        csv_rows.append(f"{22 + i},{45000 + i * 1200},{dept},{target_val}")
    csv_content = "\n".join(csv_rows).encode("utf-8")

    files = {"file": ("staff.csv", csv_content, "text/csv")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert upload_res.status_code == 201

    # Confirm target
    confirm_payload = {
        "target_column": "Target",
        "task_type": "binary_classification",
        "selected_models": models,
        "primary_metric": "f1_macro",
    }
    confirm_res = client.post(
        f"/api/v1/projects/{project_id}/target/confirm", json=confirm_payload
    )
    assert confirm_res.status_code == 200

    # Start training
    start_res = client.post(f"/api/v1/projects/{project_id}/training/start")
    assert start_res.status_code == 202
    run_id = start_res.json()["run_id"]

    # Wait for completion
    for _ in range(25):
        time.sleep(0.5)
        run_res = client.get(f"/api/v1/runs/{run_id}")
        if run_res.status_code == 200 and run_res.json()["status"] == "completed":
            break

    return project_id, models[-1]


def test_global_explanation_linear_model(client: TestClient) -> None:
    """Verify global feature importance and LinearExplainer SHAP values."""
    project_id, model_id = _create_trained_project_with_models(
        client, ["dummy_classifier", "logistic_regression"]
    )

    res = client.get(
        f"/api/v1/projects/{project_id}/models/{model_id}/explanations/global"
    )
    assert res.status_code == 200
    data = res.json()

    assert data["model_id"] == "logistic_regression"
    assert "LinearExplainer" in data["method_label"]
    assert "real-world causation" in data["academic_disclaimer"]
    assert len(data["features"]) > 0
    assert data["features"][0]["rank"] == 1
    assert data["layman_summary"] is not None
    assert len(data["layman_summary"]) > 10


def test_local_explanation_linear_model(client: TestClient) -> None:
    """Verify single observation local SHAP attribution."""
    project_id, model_id = _create_trained_project_with_models(
        client, ["dummy_classifier", "logistic_regression"]
    )

    payload = {
        "inputs": {
            "Age": 28,
            "Salary": 52000,
            "Department": "Product",
        }
    }
    res = client.post(
        f"/api/v1/projects/{project_id}/models/{model_id}/explanations/local",
        json=payload,
    )
    assert res.status_code == 200
    data = res.json()

    assert data["model_id"] == "logistic_regression"
    assert "LinearExplainer" in data["method_label"]
    assert "real-world causation" in data["academic_disclaimer"]
    assert len(data["attributions"]) > 0
    assert data["attributions"][0]["direction"] in ("positive", "negative", "neutral")
    assert data["layman_explanation"] is not None


def test_global_and_local_explanation_tree_model(client: TestClient) -> None:
    """Verify TreeExplainer SHAP values for Random Forest model."""
    project_id, model_id = _create_trained_project_with_models(
        client, ["dummy_classifier", "random_forest"]
    )

    # Global
    global_res = client.get(
        f"/api/v1/projects/{project_id}/models/{model_id}/explanations/global"
    )
    assert global_res.status_code == 200
    g_data = global_res.json()
    assert g_data["model_id"] == "random_forest"
    assert "TreeExplainer" in g_data["method_label"]
    assert len(g_data["features"]) > 0

    # Local
    local_res = client.post(
        f"/api/v1/projects/{project_id}/models/{model_id}/explanations/local",
        json={"inputs": {"Age": 35, "Salary": 60000, "Department": "Engineering"}},
    )
    assert local_res.status_code == 200
    l_data = local_res.json()
    assert l_data["model_id"] == "random_forest"
    assert "TreeExplainer" in l_data["method_label"]
    assert len(l_data["attributions"]) > 0


def test_explanation_model_not_found(client: TestClient) -> None:
    """Verify requesting explanations for a nonexistent model returns structured error."""
    project_id, _ = _create_trained_project_with_models(
        client, ["dummy_classifier", "logistic_regression"]
    )

    res = client.get(
        f"/api/v1/projects/{project_id}/models/nonexistent_model/explanations/global"
    )
    assert res.status_code == 400
    err = res.json()
    assert err["error"]["code"] == "MODEL_NOT_FOUND"

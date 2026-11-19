"""Unit tests for the Tabular AI Analyst service and endpoints."""

import json
import uuid

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.services.analyst import AnalystService


def test_analyst_chat_suggestions(client: TestClient) -> None:
    """Verify that contextual suggestions are generated for a project."""
    unique_name = f"AnalystProject {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    res = client.get(f"/api/v1/projects/{project_id}/chat/suggestions")
    assert res.status_code == 200
    suggestions = res.json()
    assert isinstance(suggestions, list)
    assert len(suggestions) >= 1
    assert "prompt" in suggestions[0]
    assert "title" in suggestions[0]


def test_analyst_chat_streaming_deterministic(client: TestClient) -> None:
    """Verify that chat streaming yields valid SSE data chunks and terminates with [DONE]."""
    unique_name = f"AnalystChat {uuid.uuid4().hex[:8]}"
    create_res = client.post("/api/v1/projects", json={"name": unique_name})
    project_id = create_res.json()["id"]

    chat_payload = {
        "message": "What is the status of this project and what should I do next?",
        "history": [],
    }

    # Request without external Gemini key triggers the deterministic analyst engine
    res = client.post(
        f"/api/v1/projects/{project_id}/chat",
        json=chat_payload,
        headers={"X-Gemini-API-Key": ""},
    )
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]

    # Parse SSE text chunks
    content = res.text
    assert "data: " in content
    assert "data: [DONE]" in content

    # Verify at least one chunk deserializes to valid JSON text payload
    found_text = False
    for line in content.splitlines():
        if line.startswith("data: ") and not line.endswith("[DONE]"):
            chunk_data = json.loads(line[6:])
            if "text" in chunk_data and len(chunk_data["text"]) > 0:
                found_text = True
                break
    assert found_text is True


def test_analyst_deterministic_rules_coverage() -> None:
    """Test deterministic rule responses for different questions directly."""
    with SessionLocal() as db:
        service = AnalystService(db)
        mock_ctx = {
            "project_name": "Test Titanic",
            "has_profile": True,
            "has_models": True,
            "dataset": {
                "total_rows": 891,
                "total_columns": 12,
                "quality_score": 88.5,
                "duplicate_rows_pct": 0.0,
                "warnings": [{"code": "HIGH_MISSINGNESS", "severity": "high", "col": "Age", "msg": "Missing values"}],
                "numeric_cols": ["Age", "Fare"],
                "categorical_cols": ["Sex", "Embarked"],
            },
            "leaderboard": {
                "primary_metric": "macro_f1",
                "task_type": "binary_classification",
                "top_model": {"name": "Random Forest", "score": 0.84, "duration_sec": 1.2},
                "models": [{"name": "Random Forest", "score": 0.84, "duration_sec": 1.2}],
            },
            "top_features": [{"name": "Fare", "shap": 0.35}, {"name": "Sex", "shap": 0.28}],
        }

        # Quality question
        ans_q = service._generate_deterministic_response("Are there any quality issues?", mock_ctx)
        assert "Data Quality Diagnostic Report" in ans_q
        assert "HIGH_MISSINGNESS" in ans_q

        # Model question
        ans_m = service._generate_deterministic_response("Why did Random Forest win?", mock_ctx)
        assert "Model Leaderboard Evaluation" in ans_m
        assert "Random Forest" in ans_m

        # Feature question
        ans_f = service._generate_deterministic_response("What are the key predictive features?", mock_ctx)
        assert "Predictive Features" in ans_f
        assert "Fare" in ans_f

        # Executive summary question
        ans_v = service._generate_deterministic_response("Give me an executive summary", mock_ctx)
        assert "AutoMLens Executive Summary" in ans_v

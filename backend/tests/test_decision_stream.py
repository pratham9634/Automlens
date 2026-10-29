"""Tests for Server-Sent Events (SSE) AI Decision Streaming and User Objective Features."""

import json
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient


def _create_project_with_dataset(client: TestClient, csv_content: bytes) -> str:
    """Helper to initialize project workspace with tabular data."""
    name = f"Decision Stream Test {uuid.uuid4().hex[:8]}"
    res = client.post("/api/v1/projects", json={"name": name})
    assert res.status_code == 201
    project_id = res.json()["id"]

    files = {"file": ("data.csv", csv_content, "text/csv")}
    upload_res = client.post(f"/api/v1/projects/{project_id}/dataset/upload", files=files)
    assert upload_res.status_code == 201
    return project_id


def test_decision_stream_offline_fallback(client: TestClient) -> None:
    """Verify that SSE stream works and falls back to deterministic rule engine without Ollama."""
    csv_data = (
        b"TransactionDate,Amount,CustomerAge,Fraud\n"
        b"2023-01-15,120.50,34,0\n"
        b"2023-01-16,4500.00,45,1\n"
        b"2023-01-17,15.20,22,0\n"
        b"2023-01-18,2300.00,58,1\n"
        b"2023-01-19,89.00,31,0\n"
    )
    project_id = _create_project_with_dataset(client, csv_data)

    payload = {
        "target_column": "Fraud",
        "user_objective": "Detect fraudulent transactions and extract transaction date patterns",
    }

    # Request SSE stream
    res = client.post(f"/api/v1/projects/{project_id}/decision/stream", json=payload)
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]

    body = res.text
    assert "event: status" in body
    assert "event: token" in body
    assert "event: reasoning_completed" in body
    assert "event: pipeline_ready" in body

    # Parse pipeline_ready event
    lines = body.split("\n")
    pipeline_data = None
    for idx, line in enumerate(lines):
        if line.startswith("event: pipeline_ready"):
            # Next line should be data: {...}
            data_line = lines[idx + 1]
            if data_line.startswith("data: "):
                pipeline_data = json.loads(data_line[6:])
                break

    assert pipeline_data is not None
    assert pipeline_data["target_column"] == "Fraud"
    assert pipeline_data["task_type"] == "binary_classification"
    assert pipeline_data["user_objective"] == payload["user_objective"]

    # Verify automated date feature was detected
    eng_features = pipeline_data["engineered_features"]
    assert len(eng_features) >= 1
    date_feat = next(
        (f for f in eng_features if f["transformation_type"] == "datetime_decomposition"),
        None,
    )
    assert date_feat is not None
    assert "TransactionDate" in date_feat["source_columns"]

    # Rule 4: Mandatory Dummy Baseline
    models = pipeline_data["candidate_models"]
    assert any(m["is_baseline"] for m in models)


def test_decision_stream_mock_ollama_tokens(client: TestClient) -> None:
    """Verify that live LLM token chunks are broadcasted across the SSE stream."""
    csv_data = (
        b"SquareFootage,Bedrooms,Price\n"
        b"1200,2,250000\n"
        b"1800,3,380000\n"
        b"2400,4,520000\n"
        b"3000,5,690000\n"
    )
    project_id = _create_project_with_dataset(client, csv_data)

    class MockChunkDelta:
        def __init__(self, content):
            self.content = content

    class MockChunkChoice:
        def __init__(self, delta):
            self.delta = delta

    class MockChunk:
        def __init__(self, content):
            self.choices = [MockChunkChoice(MockChunkDelta(content))]

    async def mock_streaming_generator():
        yield MockChunk("Analyzing ")
        yield MockChunk("pricing ")
        yield MockChunk("patterns.")

    mock_stream = mock_streaming_generator()

    with patch("app.services.decision_engine.AsyncOpenAI") as mock_openai_cls:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream)
        mock_openai_cls.return_value = mock_client

        payload = {
            "target_column": "Price",
            "user_objective": "Predict house prices with explainable models",
        }
        res = client.post(f"/api/v1/projects/{project_id}/decision/stream", json=payload)
        assert res.status_code == 200
        body = res.text
        assert '{"token": "Analyzing "}' in body
        assert '{"token": "pricing "}' in body
        assert '{"token": "patterns."}' in body
        assert "event: pipeline_ready" in body


def test_target_confirmation_persists_user_objective(client: TestClient) -> None:
    """Verify that confirmed target persists user objective and engineered features."""
    csv_data = b"Income,CreditScore,Default\n50000,700,0\n80000,750,0\n30000,550,1\n120000,800,0\n"
    project_id = _create_project_with_dataset(client, csv_data)

    confirm_payload = {
        "target_column": "Default",
        "task_type": "binary_classification",
        "selected_models": ["dummy_classifier", "logistic_regression"],
        "primary_metric": "f1_macro",
        "user_objective": "Credit risk minimization",
        "engineered_features": [
            {
                "name": "Income_to_Credit_ratio",
                "source_columns": ["Income", "CreditScore"],
                "transformation_type": "interaction_ratio",
                "formula_or_desc": "Income / (CreditScore + 1e-5)",
                "rationale": "Debt-to-credit capacity metric",
            }
        ],
    }

    res = client.post(f"/api/v1/projects/{project_id}/target/confirm", json=confirm_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["user_objective"] == "Credit risk minimization"
    assert len(data["engineered_features"]) == 1
    assert data["engineered_features"][0]["name"] == "Income_to_Credit_ratio"

    # Fetch confirmation status
    get_res = client.get(f"/api/v1/projects/{project_id}/target/confirm")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["user_objective"] == "Credit risk minimization"
    assert len(get_data["engineered_features"]) == 1

"""Tests for Redis connection manager, caching layers, and fallback behaviors."""

import time
import uuid

import pytest

from app.core.redis import MemoryCacheClient, RedisManager, redis_manager
from app.api.v1.schemas.profiling import DatasetProfileResponse


def test_memory_cache_basic_operations() -> None:
    """Test get, set, delete, and overwrite in memory cache."""
    cache = MemoryCacheClient()
    assert cache.get("key1") is None

    assert cache.set("key1", "value1") is True
    assert cache.get("key1") == "value1"

    assert cache.delete("key1") is True
    assert cache.get("key1") is None
    assert cache.delete("key1") is False


def test_memory_cache_ttl_expiration() -> None:
    """Test that items expire when their TTL is exceeded."""
    cache = MemoryCacheClient()
    # Set with 1 second TTL
    cache.set("temp_key", "temp_value", ex=1)
    assert cache.get("temp_key") == "temp_value"

    # Wait for expiration
    time.sleep(1.1)
    assert cache.get("temp_key") is None


def test_redis_manager_json_helpers() -> None:
    """Test JSON serialization and deserialization in RedisManager."""
    test_key = f"test:json:{uuid.uuid4().hex}"
    test_data = {
        "project_id": "proj-123",
        "scores": [0.95, 0.88, 0.92],
        "nested": {"status": "completed"},
    }

    assert redis_manager.set_json(test_key, test_data, ttl_seconds=60) is True
    retrieved = redis_manager.get_json(test_key)
    assert retrieved == test_data

    # Cleanup
    redis_manager.delete(test_key)
    assert redis_manager.get_json(test_key) is None


def test_redis_manager_status() -> None:
    """Verify status report accurately reflects current mode."""
    status = redis_manager.get_status()
    assert "connected" in status
    assert "mode" in status
    assert status["mode"] in ("upstash_redis", "in_memory_fallback")
    assert status["default_ttl_seconds"] > 0


@pytest.mark.asyncio
async def test_pubsub_event_distribution() -> None:
    """Verify that published events are dispatched through the subscription channel."""
    import asyncio

    channel = f"test_channel_{uuid.uuid4().hex[:8]}"
    test_payload = {"type": "training_update", "progress": 50}

    received_messages = []

    async def reader():
        async for msg in redis_manager.subscribe_events(channel):
            received_messages.append(msg)
            break

    task = asyncio.create_task(reader())
    # Allow connection handshake over internet TLS to establish
    await asyncio.sleep(0.5)

    # Publish periodic pulses until the message is received
    for _ in range(5):
        redis_manager.publish_event(channel, test_payload)
        if received_messages:
            break
        await asyncio.sleep(0.3)

    await asyncio.wait_for(task, timeout=5.0)

    assert len(received_messages) >= 1
    assert "training_update" in received_messages[0]


def test_profiling_and_shap_cache_keys() -> None:
    """Verify profile and SHAP caching structure and serialization."""
    fake_project_id = f"proj_{uuid.uuid4().hex[:8]}"
    profile_key = f"automlens:profile:{fake_project_id}"
    shap_key = f"automlens:shap:global:{fake_project_id}:rf"

    sample_profile = {
        "project_id": fake_project_id,
        "total_rows": 891,
        "total_columns": 12,
        "quality_score": 88.0,
    }
    sample_shap = {
        "project_id": fake_project_id,
        "model_id": "rf",
        "top_features": ["Fare", "Age", "Pclass"],
    }

    assert redis_manager.set_json(profile_key, sample_profile) is True
    assert redis_manager.set_json(shap_key, sample_shap) is True

    assert redis_manager.get_json(profile_key) == sample_profile
    assert redis_manager.get_json(shap_key) == sample_shap

    redis_manager.delete(profile_key)
    redis_manager.delete(shap_key)
    assert redis_manager.get_json(profile_key) is None
    assert redis_manager.get_json(shap_key) is None


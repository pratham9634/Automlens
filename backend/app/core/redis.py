"""Redis connection manager, caching service, and Pub/Sub broker with in-memory fallback."""

import asyncio
from collections.abc import AsyncGenerator
import json
import threading
import time
from typing import Any

import redis
from redis import Redis
import redis.asyncio as aioredis

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("core.redis")
settings = get_settings()


class MemoryCacheClient:
    """Thread-safe, in-memory cache and event pub/sub fallback.

    Guarantees 100% offline functionality for standalone deployments and unit tests
    when no live Redis daemon or Upstash connection is present.
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, float | None]] = {}
        self._subscribers: dict[str, list[asyncio.Queue[str]]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> str | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if expires_at is not None and time.time() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: str, ex: int | None = None) -> bool:
        with self._lock:
            expires_at = time.time() + ex if ex else None
            self._store[key] = (value, expires_at)
            return True

    def delete(self, key: str) -> bool:
        with self._lock:
            return bool(self._store.pop(key, None))

    def publish(self, channel: str, message: str) -> int:
        count = 0
        queues = self._subscribers.get(channel, [])
        for q in list(queues):
            try:
                q.put_nowait(message)
                count += 1
            except Exception:
                pass
        return count

    def register_subscriber(self, channel: str, queue: asyncio.Queue[str]) -> None:
        if channel not in self._subscribers:
            self._subscribers[channel] = []
        self._subscribers[channel].append(queue)

    def unregister_subscriber(self, channel: str, queue: asyncio.Queue[str]) -> None:
        if channel in self._subscribers and queue in self._subscribers[channel]:
            self._subscribers[channel].remove(queue)
            if not self._subscribers[channel]:
                del self._subscribers[channel]

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


class RedisManager:
    """Unified manager for Upstash Redis with automatic in-memory fallback."""

    def __init__(self) -> None:
        self._sync_client: Redis | None = None
        self._async_client: aioredis.Redis | None = None
        self._memory_cache = MemoryCacheClient()
        self._is_connected: bool | None = None
        self._init_clients()

    def _init_clients(self) -> None:
        url = settings.REDIS_URL
        if not url or not url.strip():
            logger.info("No REDIS_URL configured; using high-speed in-memory cache and queue.")
            self._is_connected = False
            return

        try:
            # Sync client for synchronous routes and ML background jobs
            self._sync_client = redis.from_url(
                url.strip(),
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            # Test connectivity
            self._sync_client.ping()

            # Async client for FastAPI SSE streams and async tasks
            self._async_client = aioredis.from_url(
                url.strip(),
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            self._is_connected = True
            logger.info("Connected to Redis at %s", url.split("@")[-1] if "@" in url else "host")
        except Exception as exc:
            logger.warning("Failed to connect to Redis (%s). Falling back to in-memory cache.", exc)
            self._sync_client = None
            self._async_client = None
            self._is_connected = False

    @property
    def is_connected(self) -> bool:
        return bool(self._is_connected and self._sync_client is not None)

    def get(self, key: str) -> str | None:
        if self.is_connected and self._sync_client is not None:
            try:
                return self._sync_client.get(key)
            except Exception as exc:
                logger.warning("Redis GET error for key '%s': %s", key, exc)
        return self._memory_cache.get(key)

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        ex = ttl_seconds if ttl_seconds is not None else settings.REDIS_CACHE_TTL_SECONDS
        if self.is_connected and self._sync_client is not None:
            try:
                self._sync_client.set(key, value, ex=ex)
                return True
            except Exception as exc:
                logger.warning("Redis SET error for key '%s': %s", key, exc)
        return self._memory_cache.set(key, value, ex=ex)

    def delete(self, key: str) -> bool:
        if self.is_connected and self._sync_client is not None:
            try:
                return bool(self._sync_client.delete(key))
            except Exception as exc:
                logger.warning("Redis DELETE error for key '%s': %s", key, exc)
        return self._memory_cache.delete(key)

    def get_json(self, key: str) -> Any | None:
        raw = self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Failed to parse cached JSON for key '%s': %s", key, exc)
            return None

    def set_json(self, key: str, data: Any, ttl_seconds: int | None = None) -> bool:
        try:
            payload = json.dumps(data)
            return self.set(key, payload, ttl_seconds=ttl_seconds)
        except Exception as exc:
            logger.warning("Failed to serialize JSON for key '%s': %s", key, exc)
            return False

    def publish_event(self, channel: str, message: dict[str, Any] | str) -> int:
        raw = json.dumps(message) if isinstance(message, dict) else str(message)
        if self.is_connected and self._sync_client is not None:
            try:
                return self._sync_client.publish(channel, raw)
            except Exception as exc:
                logger.warning("Redis PUBLISH error on channel '%s': %s", channel, exc)
        return self._memory_cache.publish(channel, raw)

    async def subscribe_events(self, channel: str) -> AsyncGenerator[str, None]:
        if self.is_connected and self._async_client is not None:
            pubsub = self._async_client.pubsub()
            try:
                await pubsub.subscribe(channel)
                async for msg in pubsub.listen():
                    if msg and msg.get("type") == "message":
                        yield str(msg.get("data"))
            except Exception as exc:
                logger.warning("Redis async subscribe error on '%s': %s", channel, exc)
            finally:
                try:
                    await pubsub.unsubscribe(channel)
                    if hasattr(pubsub, "aclose"):
                        await pubsub.aclose()
                    else:
                        await pubsub.close()
                except Exception:
                    pass
        else:
            # In-memory pub/sub fallback via asyncio.Queue
            queue: asyncio.Queue[str] = asyncio.Queue()
            self._memory_cache.register_subscriber(channel, queue)
            try:
                while True:
                    msg = await queue.get()
                    yield msg
            finally:
                self._memory_cache.unregister_subscriber(channel, queue)

    def get_status(self) -> dict[str, Any]:
        return {
            "connected": self.is_connected,
            "mode": "upstash_redis" if self.is_connected else "in_memory_fallback",
            "default_ttl_seconds": settings.REDIS_CACHE_TTL_SECONDS,
        }


# Global singleton instance
redis_manager = RedisManager()

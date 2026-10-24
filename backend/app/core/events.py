"""Server-Sent Events (SSE) Pub/Sub Hub with historical replay for real-time telemetry."""

import asyncio
import json
from collections import defaultdict
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from app.core.logging import get_logger

logger = get_logger("events.hub")


class SSEEventHub:
    """In-memory event hub broadcasting real-time training progress to connected clients."""

    def __init__(self) -> None:
        self._listeners: dict[str, list[asyncio.Queue[dict]]] = defaultdict(list)
        self._history: dict[str, list[dict]] = defaultdict(list)
        self._completed_runs: set[str] = set()

    def publish(self, run_id: str, event_type: str, data: dict) -> None:
        """Publish an event to all subscribers of a run and persist to replay history."""
        payload = {
            "run_id": run_id,
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(UTC).isoformat(),
        }

        # Save to history for page-refresh resilience
        self._history[run_id].append(payload)

        if event_type in ("run_completed", "run_failed"):
            self._completed_runs.add(run_id)

        # Distribute to all active listeners
        active_queues = self._listeners.get(run_id, [])
        for q in active_queues:
            try:
                q.put_nowait(payload)
            except Exception as exc:
                logger.warning("Failed to queue event for subscriber: %s", exc)

    async def subscribe(self, run_id: str) -> AsyncGenerator[str, None]:
        """Subscribe to a run's event stream.

        Replays historical events first so clients catch up instantly.
        """
        queue: asyncio.Queue[dict] = asyncio.Queue()
        self._listeners[run_id].append(queue)

        try:
            # 1. Replay historical events
            for historical_event in self._history.get(run_id, []):
                event_name = historical_event["event"]
                event_data = json.dumps(historical_event["data"])
                yield f"event: {event_name}\ndata: {event_data}\n\n"

            # If the run already finished in the past, close stream
            if run_id in self._completed_runs:
                return

            # 2. Stream live events
            while True:
                try:
                    # Timeout after 30 seconds to send keepalive ping
                    item = await asyncio.wait_for(queue.get(), timeout=30.0)
                    event_name = item["event"]
                    event_data = json.dumps(item["data"])
                    yield f"event: {event_name}\ndata: {event_data}\n\n"

                    if event_name in ("run_completed", "run_failed"):
                        break
                except TimeoutError:
                    # Send comment ping to keep connection open through proxies/NAT
                    yield ": ping\n\n"

        except asyncio.CancelledError:
            logger.info("SSE client disconnected from run %s", run_id)
        finally:
            if queue in self._listeners[run_id]:
                self._listeners[run_id].remove(queue)


# Singleton event hub instance
event_hub = SSEEventHub()

"""Per-client cap on failed sign-ins (ADR 0005), on top of the per-account lockout."""

import threading
import time
from collections import deque

MAX_FAILURES = 10
WINDOW_SECONDS = 15 * 60

# shortcut: in memory, per process; fine for our single uvicorn worker,
# move to Postgres if we ever run more than one.
_failures: dict[str, deque[float]] = {}
_lock = threading.Lock()


def _recent(client: str, now: float) -> deque[float]:
    times = _failures.setdefault(client, deque())
    while times and times[0] <= now - WINDOW_SECONDS:
        times.popleft()
    return times


def retry_after(client: str) -> int | None:
    """Seconds this client must wait before trying again, or None if it may try now."""
    now = time.monotonic()
    with _lock:
        times = _recent(client, now)
        if len(times) < MAX_FAILURES:
            if not times:
                del _failures[client]  # don't keep an entry per client forever
            return None
        return int(times[0] + WINDOW_SECONDS - now) + 1


def record_failure(client: str) -> None:
    with _lock:
        now = time.monotonic()
        _recent(client, now).append(now)


def reset() -> None:
    with _lock:
        _failures.clear()

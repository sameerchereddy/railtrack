# Testing Infrastructure

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Feed service (Python) | `pytest` | Run from `services/feed/` |
| Frontend (TypeScript) | `Vitest` | Native Vite integration, no extra config |

```bash
# Python
cd services/feed && python -m pytest tests/ -v

# TypeScript
cd frontend && npm test
npm run test:watch   # watch mode
```

---

## Feed Service

Tests live in `services/feed/tests/test_processor.py`.

The two functions worth testing are:

- **`sname()`** — resolves a STANOX code to a station name through a 3-tier fallback (coords JSON → CSV → CORPUS cache → raw code)
- **`update_train_from_event()`** — the state machine; applies a single Network Rail event to in-memory train state

### How tests are structured

Rather than building raw dicts in every test, there are builder functions at the top of the file:

```python
activation_event("TRAIN001", toc_id="VT")
movement_event("TRAIN001", variation="LATE", timetable_variation="3")
cancellation_event("TRAIN001")
```

Each has sensible defaults. Tests only specify the fields they actually care about.

### What's covered

**STANOX resolution** — one test per tier, plus the partial-hit case where a coords entry exists but has no `name` key (should fall through, not return empty).

**State machine transitions**
- Activation creates a train entry with the right fields
- Movement updates position, appends a journey stop, resolves the station name
- Cancellation sets the flag; reinstatement documents current behaviour
- Journey list is capped at `max_journey` to bound memory on a long-running process

**Edge cases worth calling out:**
- Movement arrives before Activation — this happens in production during cold-start and message reordering. Train should still be created.
- Malformed timestamps (`""`, `None`, `"not-a-number"`) degrade to `0`, not an exception. The feed gets raw JSON from Network Rail.
- Cold-start idempotency — replaying the same events through two fresh `AppState` instances must produce identical final state. This is the architectural guarantee that makes the 6-hour replay on startup reliable.

---

## Frontend

Tests live in `frontend/src/lib/__tests__/interpolate.test.ts`.

`interpolatePosition()` drives the 60fps animation loop — it calculates where a train should be drawn on the map right now, linearly interpolating between its last known departure and next expected station based on elapsed time.

### Time control

The function calls `Date.now()` internally. Tests pin the clock with Vitest's fake timers so each case controls exactly how much time has elapsed:

```typescript
vi.useFakeTimers();
vi.setSystemTime(NOW + 15 * 60 * 1000); // 15 minutes into a 30-minute run
```

### What's covered

- `frac = 0` → returns departure coords exactly
- `frac = 0.5` → returns midpoint
- `frac = 1` → returns arrival coords exactly
- `frac > 1` → clamps; a train held past its run time shouldn't fly off the map
- Negative elapsed (clock skew) → clamps to 0
- `last_event_type !== 'DEPARTURE'` → falls back to last known position
- `next_lat / next_lng` is `null` → falls back (not all STANOX codes have coordinates)
- `next_run_time = 0` → falls back; guards the division

---

## What's not covered yet

- **IPC rate-limiting** (`ipc.py`) — needs real or mocked Unix sockets
- **API route handlers** — journey reconstruction needs `pytest-asyncio` + a Motor mock
- **React components** — needs `@testing-library/react`; add `// @vitest-environment jsdom` at the top of those test files
- **`useWebSocket` reconnection** — fake timers + a mocked `WebSocket` constructor; doable but fiddly

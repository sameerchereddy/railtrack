# Copilot instructions for Rail Track

## What this repo is

A real-time live train map. The feed service consumes Network Rail STOMP events, maintains an in-memory train state machine, and publishes map snapshots over a Unix socket every 5 seconds. The API service caches those snapshots and serves them over WebSocket and REST. The React frontend renders trains on a Leaflet map with 60fps interpolation.

---

## Architecture rules

- **Feed → API communication is IPC only.** The only message type published over the Unix socket is `map_update`. Do not add new IPC message types without a clear reason.
- **Journey detail comes from MongoDB, not from memory.** `GET /api/trains/{id}` queries and replays MongoDB events on demand. Do not cache journeys in the API's `AppState`.
- **`AppState` in the API is a read-through cache.** It stores only `_map_trains` and `_map_meta` from the last IPC message. Do not add fields to it for new features — serve new data from the IPC payload or MongoDB directly.
- **The feed's `AppState` owns train state.** `active_trains` is the single source of truth for live train positions. The API has no write path.

---

## Python rules

- Services live in `services/feed` and `services/api`. Shared pure-data modules go in `shared/`.
- Use `threading.Lock` in the feed (synchronous pymongo + stomp.py threads). Use `asyncio.Lock` in the API (async FastAPI + motor).
- All database access in the feed goes through `feed/database.py`. All database access in the API uses `api/database.get_db()`.
- Routers are created via factory functions (e.g. `create_trains_router(ref_data)`) that close over their dependencies. Do not use `Depends` for module-level singletons.
- `sname()` in `feed/processor.py` and `api/reference.py` is the canonical STANOX resolver. Do not inline STANOX name lookups elsewhere.
- Do not add stats tracking or event aggregation to the feed. Stats visible on the frontend come from the `meta` dict in `map_update`.

---

## TypeScript / React rules

- **Never put Leaflet objects in React state.** Maps, markers, and layer groups live in `useRef`. Leaflet is driven imperatively.
- **The rAF loop in `LiveMap.tsx` is the only place marker positions are updated.** Do not call `setLatLng` anywhere else.
- **Zustand store contains only `mapSlice`.** Do not add slices for features that can be handled with local `useState`.
- Filter state (TOC, status) lives in `MapPage.tsx` as local state and is passed down as props + synced to refs in `LiveMap`. It does not belong in the store.
- `interpolatePosition()` in `lib/interpolate.ts` is the single place train positions are computed from timestamps. Do not duplicate this logic in components.
- The WebSocket hook (`useWebSocket.ts`) handles reconnection. Do not add reconnection logic inside components.

---

## What not to do

- Do not add a dashboard or event stream view. The app is a map; that is the product.
- Do not send journey data over IPC. It belongs in MongoDB, fetched on demand.
- Do not add `train_update` or `event_batch` IPC message types back. They were removed deliberately — they caused large payloads for no benefit to the map.
- Do not store `active_trains` in the API process. The API is stateless with respect to individual trains.
- Do not use `useEffect` to update Leaflet markers. Use the Zustand subscription or the rAF loop.
- Do not add REST polling to the frontend. All live data comes from the WebSocket.

---

## Testing

Every new function or module should have unit tests alongside it. Follow the existing patterns:

- **Python** — add tests to `services/feed/tests/` (or create `services/api/tests/` for API logic). Use builder functions for event/state fixtures rather than inline dicts. Run with `python -m pytest tests/ -v`.
- **TypeScript** — add test files under `src/**/__tests__/`. Pure logic tests use `environment: 'node'` (the default). Tests that need the DOM add `// @vitest-environment jsdom` at the top of the file. Run with `npm test`.

**What always needs tests:**
- Any new state machine transition in `processor.py`
- Any new fallback or resolution logic (STANOX, timestamps, status mapping)
- Any pure utility function added to `frontend/src/lib/`

**What doesn't need unit tests:**
- FastAPI route handlers — these need integration tests with a real or mocked DB, not unit tests
- React components — test behaviour through `@testing-library/react`, not implementation details
- IPC/WebSocket plumbing — these are integration concerns

See [docs/testing-infrastructure.md](../docs/testing-infrastructure.md) for context on test design decisions.

---

## Naming conventions

| Thing | Convention |
|---|---|
| Python files | `snake_case.py` |
| Python classes | `PascalCase` |
| React components | `PascalCase.tsx` |
| Hooks | `useXxx.ts` |
| Zustand slices | `createXxxSlice` / `xxxSlice.ts` |
| API route factories | `create_xxx_router(deps)` |
| IPC message types | `snake_case` string (`map_update`) |

---

## Reference data

- `shared/station_coords.json` — STANOX → `{lat, lng, name, crs}`. Source of truth for map coordinates.
- `shared/stanox-code.csv` — official NR reference, 11k+ entries.
- `shared/toc_names.py` — TOC ID → operator name. Import from here, do not hardcode elsewhere.

STANOX resolution order: `station_coords` → `stanox-code.csv` → `stanox_lookup.json` → raw code. This order is intentional and must not change.

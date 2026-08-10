# Component Test Plan — Suburban Insight

IEEE 829-2008 Level Test Plan, **Component** level: testing individual
backend components in isolation. This is the base of the test hierarchy —
see `tests/component-integration-test-plan/` for how these components are
tested *together*, and `CLAUDE.md` for how the four levels relate.

## 1. Introduction

**1.1 Document identifier:** `component-test-plan.md`, v1, 2026-08-10

**1.2 Scope:** each backend route/module tested against its own contract
(status codes, response shape, error handling) — not how it interacts with
other components (that's Component Integration) and not full user flows
(that's System).

**1.3 References:** `docs/architecture.md` (API design), `CLAUDE.md`

## 2. Test Items

| ID | Component | Test file |
|---|---|---|
| CT-1 | `GET /health` | `backend/tests/test_health.py` |
| CT-2 | `GET /api/suburbs`, `GET /api/suburbs/{id}` | `backend/tests/test_suburbs.py` |
| CT-3 | `POST /api/compare` | `backend/tests/test_compare.py` |
| CT-4 | `GET /api/councils`, council-filtered `GET /api/suburbs` | `backend/tests/test_councils.py` |

## 3. Approach

Fully automated, pytest + FastAPI's `TestClient`. Each test targets one
endpoint's own behaviour: does it return the right shape, the right status
code for a bad input, the right error for a missing resource. Runs against
the real `data/processed/*.json` (loaded once at app startup), not mocked
data — component tests here still exercise real data, they just don't
check *cross-component* correctness (that distinction is what separates
this level from Component Integration).

## 4. Test Cases

| Test | Checks |
|---|---|
| `test_health_check` | `/health` returns `200 {"status": "ok"}` |
| `test_list_suburbs_returns_data` | `/api/suburbs` returns a non-empty list with the expected summary fields |
| `test_get_known_suburb` | `/api/suburbs/vic-clayton` returns full profile data, real population, real cultural background |
| `test_get_unknown_suburb_returns_404` | Unknown suburb id → `404`, not a crash or empty `200` |
| `test_compare_returns_suburbs_in_order` | `/api/compare` preserves requested suburb order in the response |
| `test_compare_unknown_suburb_returns_404` | One bad id in a compare request → `404` for the whole request |
| `test_compare_empty_list_rejected` | Empty `suburb_ids` → `422` (validation), not silently accepted |
| `test_list_councils_returns_31` | `/api/councils` returns exactly the 31 expected councils with the right shape |
| `test_suburbs_filtered_by_council_include_boundary` | `?council_id=X` returns only that council's suburbs, each with boundary geometry |
| `test_suburbs_unfiltered_have_no_boundary` | Unfiltered `/api/suburbs` omits boundary geometry (payload-size design decision — see `CLAUDE.md`) |

## 5. Environment & Resources

pytest 9.x, FastAPI `TestClient`, real `data/processed/suburbs.json` and
`councils.json` (built by `data_pipeline/`). No network access needed —
unlike the data pipeline itself, the running backend never calls out to
ABS.

## 6. Entry / Exit Criteria

**Entry:** `data/processed/suburbs.json` and `councils.json` exist and are
non-empty (i.e. the data pipeline has been run at least once).
**Exit:** all component tests pass.

## 7. Risks

None significant — this is the smallest, most stable layer to test; risk
increases at the Integration/System levels where more moving parts
interact.

## 8. Status

**Done, ongoing.** 10/10 passing as of 2026-08-10 (`cd backend && pytest
tests/test_health.py tests/test_suburbs.py tests/test_compare.py
tests/test_councils.py`). This suite has existed and grown since Milestone
3 and is re-run before every commit that touches the backend.

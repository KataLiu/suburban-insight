"""
Component Integration tests — see tests/component-integration-test-plan/
for the formal plan these implement (CIT-1 through CIT-5 below).

These differ from the per-endpoint tests in test_suburbs.py / test_councils.py
/ test_compare.py: those check "does this one component behave correctly in
isolation" (Component Test Plan level). These check "do two or more already-
tested components correctly work TOGETHER" — real pipeline output flowing
into the real backend, and cross-references between records staying valid.
No mocking: this reads the actual data/processed/*.json the pipeline
produced, exactly as the running backend does.
"""

from fastapi.testclient import TestClient

from app.main import app
from app.services.data_loader import get_all_councils, get_all_suburbs

client = TestClient(app)


def test_cit1_pipeline_output_loads_into_backend():
    """Data pipeline -> Backend. The real suburbs.json/councils.json (not a
    fixture) load into the backend's in-memory store with a sane count and
    every record shaped as the API contract expects."""
    suburbs = get_all_suburbs()
    councils = get_all_councils()

    assert len(suburbs) > 500, "expected ~527 suburbs from the real dataset"
    assert len(councils) == 31, "expected all 31 Metro Melbourne councils"

    for suburb in suburbs:
        assert suburb["id"] and suburb["name"] and suburb["council"]
        assert "lat" in suburb["location"] and "lng" in suburb["location"]


def test_cit2_every_suburb_council_exists_in_councils_dataset():
    """Data pipeline -> Backend, cross-file integrity. Every suburb's
    `council` field must name a council that's actually in councils.json —
    otherwise the map's council->suburb drill-down silently loses suburbs."""
    suburbs = get_all_suburbs()
    council_names = {c["name"] for c in get_all_councils()}

    orphaned = [s["name"] for s in suburbs if s["council"] not in council_names]
    assert not orphaned, f"suburbs referencing a non-existent council: {orphaned}"


def test_cit3_similar_suburb_ids_reference_real_suburbs():
    """Clustering -> Backend, cross-record integrity. Regression test for
    the exact class of bug hit during manual testing (2026-08-05): a
    suburb's cluster.similar_suburb_ids pointed to suburbs that existed in
    the full dataset but couldn't be resolved from a council-scoped subset
    on the frontend. This checks the underlying data itself: every id
    train_clusters.py wrote must correspond to a suburb that still exists."""
    suburbs = get_all_suburbs()
    valid_ids = {s["id"] for s in suburbs}

    for suburb in suburbs:
        for similar_id in suburb["cluster"]["similar_suburb_ids"]:
            assert similar_id in valid_ids, (
                f"{suburb['name']}'s similar_suburb_ids references "
                f"'{similar_id}', which doesn't exist in the dataset"
            )


def test_cit4_council_filter_returns_only_that_councils_suburbs():
    """API layer -> Backend service. GET /api/suburbs?council_id=X must
    return suburbs whose council matches X's real name, and must include
    boundary geometry (frontend's map rendering depends on this)."""
    council = get_all_councils()[0]
    response = client.get("/api/suburbs", params={"council_id": council["id"]})
    assert response.status_code == 200
    body = response.json()

    assert len(body) == council["suburb_count"]
    assert all(s["council"] == council["name"] for s in body)
    assert all(s["boundary"] is not None for s in body)


def test_cit5_compare_endpoint_accepts_ids_from_live_suburb_list():
    """Frontend contract -> Backend, end-to-end without hardcoded ids. The
    frontend always gets suburb ids FROM /api/suburbs first, then passes
    them to /api/compare — this exercises that exact sequence instead of
    assuming a hardcoded id like "vic-clayton" still exists."""
    suburbs_response = client.get("/api/suburbs")
    live_ids = [s["id"] for s in suburbs_response.json()[:3]]

    compare_response = client.post("/api/compare", json={"suburb_ids": live_ids})
    assert compare_response.status_code == 200
    body = compare_response.json()
    assert [s["id"] for s in body] == live_ids

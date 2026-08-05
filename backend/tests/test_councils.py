from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_councils_returns_31():
    response = client.get("/api/councils")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 31
    assert {"id", "name", "boundary", "suburb_count", "avg_median_weekly_rent"} <= body[0].keys()


def test_suburbs_filtered_by_council_include_boundary():
    response = client.get("/api/suburbs", params={"council_id": "council-monash"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) > 0
    assert all(s["council"] == "Monash" for s in body)
    assert all(s["boundary"] is not None for s in body)


def test_suburbs_unfiltered_have_no_boundary():
    response = client.get("/api/suburbs")
    assert response.status_code == 200
    body = response.json()
    assert all(s["boundary"] is None for s in body)

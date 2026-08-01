from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_compare_returns_suburbs_in_order():
    response = client.post("/api/compare", json={"suburb_ids": ["vic-box-hill", "vic-clayton"]})
    assert response.status_code == 200
    body = response.json()
    assert [s["name"] for s in body] == ["Box Hill", "Clayton"]


def test_compare_unknown_suburb_returns_404():
    response = client.post("/api/compare", json={"suburb_ids": ["vic-clayton", "not-real"]})
    assert response.status_code == 404


def test_compare_empty_list_rejected():
    response = client.post("/api/compare", json={"suburb_ids": []})
    assert response.status_code == 422

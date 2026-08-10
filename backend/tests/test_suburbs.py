from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_suburbs_returns_data():
    response = client.get("/api/suburbs")
    assert response.status_code == 200
    body = response.json()
    assert len(body) > 0
    assert {"id", "name", "state", "location", "population"} <= body[0].keys()


def test_get_known_suburb():
    response = client.get("/api/suburbs/vic-clayton")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Clayton"
    assert body["demographics"]["population"] > 0
    assert len(body["cultural_background"]) > 0
    assert body["commute_to_work"]["car_pct"] > 0


def test_get_unknown_suburb_returns_404():
    response = client.get("/api/suburbs/not-a-real-suburb")
    assert response.status_code == 404

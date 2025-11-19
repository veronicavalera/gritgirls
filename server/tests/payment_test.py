# server/tests/test_payments.py
import json

def test_start_listing_checkout_makes_session(client, owner_headers, monkeypatch):
    # Create draft bike
    r = client.post("/api/bikes", json={"title": "Draft", "price_usd": 1000}, headers=owner_headers)
    assert r.status_code == 201
    bike_id = r.get_json()["id"]

    # Mock stripe.checkout.Session.create
    called = {}
    class FakeSession:
        url = "https://checkout.stripe.fake/session"
    def fake_create(**kwargs):
        called["kwargs"] = kwargs
        return FakeSession()
    monkeypatch.setattr("app.payments.stripe.checkout.Session.create", fake_create)

    # Hit endpoint
    r2 = client.post("/api/payments/checkout/listing", json={"bike_id": bike_id}, headers=owner_headers)
    assert r2.status_code == 200, r2.get_json()
    data = r2.get_json()
    assert data["checkout_url"] == FakeSession.url
    assert "kwargs" in called
    assert called["kwargs"]["mode"] == "payment"


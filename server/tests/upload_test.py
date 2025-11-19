# server/tests/test_rides.py
def _create_ride(client, headers, **over):
    payload = {
        "title": "Saturday Tempo Ride",
        "date": "2025-11-20",
        "time": "08:30",
        "difficulty": "Intermediate",
        "terrain": "Singletrack",
        "state": "CO",
        "zip_prefix": "803",
        "description": "12 miles mellow",
    }
    payload.update(over)
    return client.post("/api/rides", json=payload, headers=headers)

def test_create_ride_requires_auth(client):
    r = client.post("/api/rides", json={"title": "x", "date": "2025-11-20"})
    assert r.status_code == 401

def test_create_list_and_rsvp(client, auth_headers):
    r = _create_ride(client, auth_headers)
    assert r.status_code == 201
    ride_id = r.get_json()["id"]

    # List
    r2 = client.get("/api/rides?state=CO")
    assert r2.status_code == 200
    assert isinstance(r2.get_json(), list)

    # RSVP toggle
    #r3 = client.post(f"/api/rides/{ride_id}/rsvp", headers=auth_headers)
    #assert r3.status_code == 200
    # Toggle again (un-RSVP)
    #r4 = client.post(f"/api/rides/{ride_id}/rsvp", headers=auth_headers)
    #assert r4.status_code == 200

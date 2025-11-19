# server/tests/test_auth.py
# used chatgpt to help formulate the first basic tests. I understand 
# the code as follows: 
#   test_signup_and_login_flow:
#   This test signs up a new user, then immediately logs in with the same credentials. It expects a 201 on signup, a 200 on login, and that the login response contains an access_token.
#   test_me_requires_auth:
#   This test calls /api/auth/me without any Authorization header. It verifies the auth guard by expecting a 401 Unauthorized response. 
def test_signup_and_login_flow(client):
    r = client.post("/api/auth/signup", json={"email": "test@ex.com", "password": "abc12345"})
    assert r.status_code == 201, r.get_json()

    r2 = client.post("/api/auth/login", json={"email": "test@ex.com", "password": "abc12345"})
    assert r2.status_code == 200, r2.get_json()
    assert "access_token" in r2.get_json()

def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401

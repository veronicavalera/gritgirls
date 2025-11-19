# server/tests/conftest.py
import os
import sys
import io
import json
import shutil
import tempfile
import types
import pytest

# ----- Make the repo root importable so "from server.app import create_app" works -----
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Import the real Flask factory and db from the application package
from server.app import create_app, db  

# =============================================================================
# Create a synthetic top-level "app" module alias
# -----------------------------------------------------------------------------
# Some tests monkeypatch "app.payments..." (short import path).
# Our real code lives under "server.app", so we create a fake "app" package
# that forwards attributes to "server.app" and specifically exposes
# "server.app.payments" at "app.payments". This avoids ModuleNotFoundError
# during monkeypatching.
# =============================================================================
import server.app as real_app  
import server.app.payments as real_payments  

app_pkg = types.ModuleType("app")               # create a new module object named "app"
app_pkg.__dict__.update(real_app.__dict__)      # copy server.app's attributes onto it
app_pkg.payments = real_payments                # expose payments as a submodule
sys.modules["app"] = app_pkg                    # register "app" in sys.modules
sys.modules["app.payments"] = real_payments     # and "app.payments" too


# =============================================================================
# General-purpose tmp directory fixture for tests that need a throwaway root
# =============================================================================
@pytest.fixture()
def tmp_root():
    d = tempfile.mkdtemp(prefix="gg_tests_")  # create a unique temp directory
    try:
        yield d
    finally:
        shutil.rmtree(d, ignore_errors=True)  # clean up even if test fails


# =============================================================================
# Flask app fixture
# - Provides a fresh app+DB per test session with test config
# - Sets safe defaults for env vars
# - Stubs Stripe methods so tests don't hit the network
# =============================================================================
@pytest.fixture()
def app(tmp_root, monkeypatch):
    # Minimal env for app boot (no secrets needed in tests)
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
    os.environ.setdefault("PUBLIC_SITE_URL", "http://localhost:5173")
    os.environ.setdefault("API_BASE_URL", "http://127.0.0.1:8000")
    os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_dummy")
    os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_dummy")

    flask_app = create_app()  # build the real app

    # Point DB and uploads to the temporary directory
    db_path = os.path.join(tmp_root, "test.db")
    upload_dir = os.path.join(tmp_root, "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    # Test-specific config overrides
    flask_app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_path}",
        UPLOAD_DIR=upload_dir,
    )

    # ---- Stripe stubs (prevent real API calls; make behavior predictable) ----
    try:
        import stripe  

        class _FakeSession:
            """Lightweight stand-in for stripe.checkout.Session return object."""
            def __init__(self, url="https://example.test/checkout", id="cs_test_123"):
                self.url = url
                self.id = id

        def _fake_session_create(**kwargs):
            # Return a predictable fake session for tests
            return _FakeSession()

        # Patch checkout session creation
        monkeypatch.setattr(
            "stripe.checkout.Session.create",
            staticmethod(_fake_session_create),
            raising=False,
        )

        def _fake_construct_event(payload, sig_header, secret):
            """
            Replace Stripe's signature verification with a simple JSON decode,
            so tests can control the event shape without real signatures.
            """
            if isinstance(payload, (bytes, bytearray)):
                payload = payload.decode("utf-8")
            return json.loads(payload or "{}")

        # Patch webhook event construction/verification
        monkeypatch.setattr(
            "stripe.Webhook.construct_event",
            staticmethod(_fake_construct_event),
            raising=False,
        )
    except Exception:
        # If stripe isn't importable for some reason, don't fail test collection.
        pass

    # Fresh database for the test session
    with flask_app.app_context():
        db.drop_all()
        db.create_all()

    # Yield the configured app to tests
    yield flask_app


# =============================================================================
# Flask test client fixture (makes HTTP calls to the app without running a server)
# =============================================================================
@pytest.fixture()
def client(app):
    return app.test_client()


# =============================================================================
# Auth helpers
# - Create users and return Authorization headers for convenience
# =============================================================================

@pytest.fixture()
def auth_header(client):
    """Generic authenticated user."""
    r = client.post("/api/auth/signup", json={"email": "t@e.st", "password": "pw123456"})
    assert r.status_code in (200, 201)
    r = client.post("/api/auth/login", json={"email": "t@e.st", "password": "pw123456"})
    token = r.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def auth_header_other(client):
    """A second authenticated user (useful for permission tests)."""
    r = client.post("/api/auth/signup", json={"email": "other@e.st", "password": "pw123456"})
    assert r.status_code in (200, 201)
    r = client.post("/api/auth/login", json={"email": "other@e.st", "password": "pw123456"})
    token = r.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def owner_headers(client):
    """
    Tests sometimes assert exact owner email ('owner@example.com').
    This fixture ensures a token for that specific identity.
    """
    r = client.post("/api/auth/signup", json={"email": "owner@example.com", "password": "pw123456"})
    assert r.status_code in (200, 201)
    r = client.post("/api/auth/login", json={"email": "owner@example.com", "password": "pw123456"})
    token = r.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture()
def other_headers(auth_header_other):
    """Alias for readability in tests that refer to 'other_headers'."""
    return auth_header_other

@pytest.fixture()
def auth_headers(auth_header):
    """Alias for readability in tests that refer to 'auth_headers'."""
    return auth_header


# =============================================================================
# Tiny PNG bytes/file for upload tests (1x1 pixel transparent PNG)
# =============================================================================
@pytest.fixture()
def tiny_png_bytes():
    # Minimal valid PNG file bytes
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDATx\x9cc``\x00"
        b"\x00\x00\x02\x00\x01E\xdf\x9b~\x00\x00\x00\x00IEND\xaeB`\x82"
    )

@pytest.fixture()
def tiny_png_file(tiny_png_bytes):
    """
    Returns a (filename, filelike, mimetype) triple suitable for
    Flask test client file upload (e.g., data={'file': tiny_png_file}).
    """
    return ("tiny.png", io.BytesIO(tiny_png_bytes), "image/png")

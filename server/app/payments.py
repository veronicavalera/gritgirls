# server/app/payments.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, timezone
from .models import db, Bike, User
import os
import stripe

# A dedicated blueprint for all payment-related endpoints.
# Mounted under /api in the app factory, so routes become /api/payments/... etc.
payments_bp = Blueprint("payments", __name__)

# ---- App-level pricing and timing knobs ----
LISTING_PRICE_CENTS = 1000  # $10 to publish a new listing
RENEW_PRICE_CENTS   = 300   # $3 to extend visibility
RENEW_DAYS          = 20    # Each renew extends by 20 days

def _now_utc():
    """Return timezone-aware 'now' in UTC.
    Using tz-aware datetimes avoids subtle bugs when comparing with stored timestamps."""
    return datetime.now(timezone.utc)

def _get_env(name, default=None):
    """Read an environment variable or raise a helpful error if missing.
    This makes misconfiguration fail fast (easier to debug)."""
    v = os.getenv(name, default)
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v

def _site_urls():
    """Return absolute success/cancel URLs for Stripe Checkout.
    PUBLIC_SITE_URL is your front-end origin (e.g., http://localhost:5173 or your deployed site)."""
    public = _get_env("PUBLIC_SITE_URL", "http://localhost:5173").rstrip("/")
    return {
        "success": f"{public}/pay/success",  # where Stripe sends the user after successful payment
        "cancel":  f"{public}/bikes"         # where Stripe sends the user if they cancel
    }

def _set_stripe_key():
    """Load the Stripe secret key from the environment and configure the SDK."""
    stripe.api_key = _get_env("STRIPE_SECRET_KEY")

@payments_bp.post("/payments/checkout/listing")
@jwt_required()
def start_listing_checkout():
    """
    Start a Stripe Checkout session for paying the $10 listing fee.
    Preconditions:
      - User must be authenticated.
      - The bike must exist and belong to the user.
      - The listing must be a draft (not active yet).
    Result:
      - Returns a 'checkout_url' to redirect the user to Stripe Checkout.
    """
    _set_stripe_key()
    user_id = int(get_jwt_identity())

    # Parse payload
    data = request.get_json() or {}
    bike_id = int(data.get("bike_id") or 0)
    if not bike_id:
        return jsonify({"error": "bike_id is required"}), 400

    # Load bike and check ownership
    bike = Bike.query.get(bike_id)
    if not bike or bike.owner_id != user_id:
        return jsonify({"error": "Bike not found or not yours"}), 404

    # Only drafts should go through the listing payment flow
    if bike.is_active:
        return jsonify({"error": "Listing already active"}), 400

    urls = _site_urls()
    try:
        # Create a Checkout Session for a one-time payment
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "unit_amount": LISTING_PRICE_CENTS,
                    "product_data": {"name": f"Post Listing: {bike.title[:60]}"},
                },
            }],
            success_url=urls["success"] + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=urls["cancel"],
            # Metadata comes back to us in the webhook so we can identify what to do
            metadata={
                "action": "LISTING",
                "bike_id": str(bike.id),
                "owner_id": str(user_id),
            }
        )
        # Frontend should redirect the browser to this URL
        return jsonify({"checkout_url": session.url}), 200

    # Stripe-specific error (network, invalid config, etc.)
    except stripe.error.StripeError as se:
        return jsonify({"error": str(se)}), 500
    # Belt-and-suspenders: catch-all to avoid leaking stack traces
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@payments_bp.post("/payments/checkout/renew")
@jwt_required()
def start_renew_checkout():
    """
    Start a Stripe Checkout session to renew an existing listing for 20 more days ($3).
    Preconditions:
      - User must be authenticated.
      - The bike must exist and belong to the user.
    Note:
      - We allow renewals whether currently expired or not; we'll extend from max(now, current expiry).
    """
    _set_stripe_key()
    user_id = int(get_jwt_identity())

    data = request.get_json() or {}
    bike_id = int(data.get("bike_id") or 0)
    if not bike_id:
        return jsonify({"error": "bike_id is required"}), 400

    bike = Bike.query.get(bike_id)
    if not bike or bike.owner_id != user_id:
        return jsonify({"error": "Bike not found or not yours"}), 404

    urls = _site_urls()
    try:
        # Create a Checkout Session for renewal
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "unit_amount": RENEW_PRICE_CENTS,
                    "product_data": {"name": f"Renew Listing (20 days): {bike.title[:60]}"},
                },
            }],
            success_url=urls["success"] + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=urls["cancel"],
            metadata={
                "action": "RENEW",
                "bike_id": str(bike.id),
                "owner_id": str(user_id),
            }
        )
        return jsonify({"checkout_url": session.url}), 200

    except stripe.error.StripeError as se:
        return jsonify({"error": str(se)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@payments_bp.post("/stripe/webhook")
def stripe_webhook():
    """
    Stripe will POST events (e.g., 'checkout.session.completed') to this endpoint.
    We verify the signature, read the metadata, and update the Bike accordingly.
    Behavior:
      - LISTING: activate the bike and set expires_at = now + 20 days
      - RENEW:   set expires_at = max(now, current expires_at) + 20 days
    Always return 200 to prevent Stripe from retrying (unless the signature is bad).
    """
    payload = request.data  # raw bytes of the request body
    sig = request.headers.get("Stripe-Signature", "")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not endpoint_secret:
        # Safer to fail loudly if the server is misconfigured
        return jsonify({"error": "Webhook secret not configured"}), 500

    # Verify the webhook signature (security critical)
    try:
        # NOTE: construct_event signature expects (payload, sig_header, secret)
        event = stripe.Webhook.construct_event(payload, sig, endpoint_secret)
    except Exception as e:
        # Signature check failed (or payload wasn't valid JSON)
        return jsonify({"error": f"Invalid signature: {e}"}), 400

    # We only care about successful checkout completions for now
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        # The metadata we set when creating the checkout session
        meta = session.get("metadata", {}) or {}
        action = meta.get("action")
        bike_id = int(meta.get("bike_id") or 0)
        owner_id = int(meta.get("owner_id") or 0)

        # If the webhook doesn't include what we expect, bail quietly
        if not bike_id or not action:
            return jsonify({"ok": True})  # ignore

        bike = Bike.query.get(bike_id)
        # Only modify if the bike exists and (optionally) still belongs to same owner
        if not bike or (owner_id and bike.owner_id != owner_id):
            return jsonify({"ok": True})  # ignore mismatched

        now = _now_utc()
        if action == "LISTING":
            # First-time publish: mark active and set a fresh expiry
            bike.is_active = True
            bike.expires_at = now + timedelta(days=RENEW_DAYS)
            db.session.commit()
        elif action == "RENEW":
            # Renewal: extend from the later of (now, current expiry)
            base = bike.expires_at if (bike.expires_at and bike.expires_at > now) else now
            bike.is_active = True
            bike.expires_at = base + timedelta(days=RENEW_DAYS)
            db.session.commit()

    # Always 200 so Stripe doesn't retry (we handled or intentionally ignored the event)
    return jsonify({"ok": True})

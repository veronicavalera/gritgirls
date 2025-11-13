# server/app/payments.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, timezone
from .models import db, Bike, User
import os
import stripe

payments_bp = Blueprint("payments", __name__)

LISTING_PRICE_CENTS = 1000  # $10
RENEW_PRICE_CENTS   = 300   # $3
RENEW_DAYS          = 20

def _now_utc():
    return datetime.now(timezone.utc)

def _get_env(name, default=None):
    v = os.getenv(name, default)
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v

def _site_urls():
    # PUBLIC_SITE_URL like http://localhost:5173
    public = _get_env("PUBLIC_SITE_URL", "http://localhost:5173").rstrip("/")
    return {
        "success": f"{public}/pay/success",
        "cancel":  f"{public}/bikes"
    }

def _set_stripe_key():
    stripe.api_key = _get_env("STRIPE_SECRET_KEY")

@payments_bp.post("/payments/checkout/listing")
@jwt_required()
def start_listing_checkout():
    _set_stripe_key()
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    bike_id = int(data.get("bike_id") or 0)
    if not bike_id:
        return jsonify({"error": "bike_id is required"}), 400

    bike = Bike.query.get(bike_id)
    if not bike or bike.owner_id != user_id:
        return jsonify({"error": "Bike not found or not yours"}), 404

    # must be draft to post
    if bike.is_active:
        return jsonify({"error": "Listing already active"}), 400

    urls = _site_urls()
    try:
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
            metadata={
                "action": "LISTING",
                "bike_id": str(bike.id),
                "owner_id": str(user_id),
            }
        )
        return jsonify({"checkout_url": session.url}), 200
    except stripe.error.StripeError as se:
        return jsonify({"error": str(se)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@payments_bp.post("/payments/checkout/renew")
@jwt_required()
def start_renew_checkout():
    _set_stripe_key()
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    bike_id = int(data.get("bike_id") or 0)
    if not bike_id:
        return jsonify({"error": "bike_id is required"}), 400

    bike = Bike.query.get(bike_id)
    if not bike or bike.owner_id != user_id:
        return jsonify({"error": "Bike not found or not yours"}), 404

    # can renew whether expired or not; we’ll extend from max(now, expires_at)
    urls = _site_urls()
    try:
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
    payload = request.data
    sig = request.headers.get("Stripe-Signature", "")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not endpoint_secret:
        return jsonify({"error": "Webhook secret not configured"}), 500

    try:
        event = stripe.Webhook.construct_event(payload, sig, endpoint_secret)
    except Exception as e:
        return jsonify({"error": f"Invalid signature: {e}"}), 400

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        meta = session.get("metadata", {}) or {}
        action = meta.get("action")
        bike_id = int(meta.get("bike_id") or 0)
        owner_id = int(meta.get("owner_id") or 0)

        if not bike_id or not action:
            return jsonify({"ok": True})  # ignore

        bike = Bike.query.get(bike_id)
        if not bike or (owner_id and bike.owner_id != owner_id):
            return jsonify({"ok": True})  # ignore mismatched

        now = _now_utc()
        if action == "LISTING":
            bike.is_active = True
            bike.expires_at = now + timedelta(days=RENEW_DAYS)
            db.session.commit()
        elif action == "RENEW":
            base = bike.expires_at if (bike.expires_at and bike.expires_at > now) else now
            bike.is_active = True
            bike.expires_at = base + timedelta(days=RENEW_DAYS)
            db.session.commit()

    # always 200 so Stripe doesn’t retry
    return jsonify({"ok": True})

# server/app/payments.py
from __future__ import annotations

import os
import json
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from .models import db, Bike

import stripe

payments_bp = Blueprint("payments", __name__)

# Read Stripe env once at import (create_app should call load_dotenv before registering blueprints)
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "http://localhost:5173").strip()
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


# ---------- helpers ----------

def _json_error(message: str, code: int = 400):
    return jsonify({"error": message}), code


def _get_bike_owned_or_404(bike_id: int, owner_id: int):
    bike = Bike.query.get(bike_id)
    if not bike:
        return None, _json_error("Bike not found", 404)
    if bike.owner_id != owner_id:
        return None, _json_error("You do not own this listing", 403)
    return bike, None


def _ensure_stripe_key():
    """
    Ensure stripe.api_key is set from env. This also allows reloading if .env changed.
    """
    global STRIPE_SECRET_KEY
    if not STRIPE_SECRET_KEY:
        STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if not STRIPE_SECRET_KEY:
        return False
    stripe.api_key = STRIPE_SECRET_KEY
    return True


# ---------- routes: start checkout ----------

@payments_bp.post("/payments/checkout/listing")
@jwt_required()
def start_listing_checkout():
    """
    Create a Stripe Checkout Session for the $10 initial listing fee.
    On successful payment (via webhook), the listing is published (active) for 20 days.
    """
    try:
        if not _ensure_stripe_key():
            return _json_error("Stripe secret key not configured", 500)

        data = request.get_json() or {}
        bike_id = int(data.get("bike_id") or 0)
        if not bike_id:
            return _json_error("bike_id is required", 400)

        owner_id = int(get_jwt_identity())
        bike, err = _get_bike_owned_or_404(bike_id, owner_id)
        if err:
            return err

        # $10 in cents
        unit_amount = 1000

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"GritGirls Listing: {bike.title[:80]}",
                    },
                    "unit_amount": unit_amount,
                },
                "quantity": 1,
            }],
            success_url=f"{PUBLIC_SITE_URL}/pay/success?bike={bike_id}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{PUBLIC_SITE_URL}/bikes/{bike_id}",
            metadata={
                "type": "listing",
                "bike_id": str(bike_id),
                "owner_id": str(owner_id),
            },
        )
        return jsonify({"checkout_url": session.url})
    except Exception as e:
        current_app.logger.exception("Error starting listing checkout")
        msg = getattr(e, "user_message", str(e))
        return _json_error(f"Stripe error: {msg}", 502)


@payments_bp.post("/payments/checkout/renew")
@jwt_required()
def start_renew_checkout():
    """
    Create a Stripe Checkout Session for the $3 renewal fee.
    On successful payment (via webhook), extend visibility by 20 days from max(now, expires_at).
    """
    try:
        if not _ensure_stripe_key():
            return _json_error("Stripe secret key not configured", 500)

        data = request.get_json() or {}
        bike_id = int(data.get("bike_id") or 0)
        if not bike_id:
            return _json_error("bike_id is required", 400)

        owner_id = int(get_jwt_identity())
        bike, err = _get_bike_owned_or_404(bike_id, owner_id)
        if err:
            return err

        # $3 in cents
        unit_amount = 300

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"GritGirls Renewal: {bike.title[:80]}",
                    },
                    "unit_amount": unit_amount,
                },
                "quantity": 1,
            }],
            success_url=f"{PUBLIC_SITE_URL}/pay/success?bike={bike_id}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{PUBLIC_SITE_URL}/bikes/{bike_id}",
            metadata={
                "type": "renew",
                "bike_id": str(bike_id),
                "owner_id": str(owner_id),
            },
        )
        return jsonify({"checkout_url": session.url})
    except Exception as e:
        current_app.logger.exception("Error starting renewal checkout")
        msg = getattr(e, "user_message", str(e))
        return _json_error(f"Stripe error: {msg}", 502)


# ---------- webhook ----------

@payments_bp.post("/stripe/webhook")
def stripe_webhook():
    """
    Handle Stripe events. We care about checkout.session.completed.
    Uses STRIPE_WEBHOOK_SECRET from env; keep it in sync with your `stripe listen` session.
    """
    try:
        payload = request.get_data(as_text=True)
        sig_header = request.headers.get("Stripe-Signature", "")

        secret = WEBHOOK_SECRET or os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
        if not secret:
            current_app.logger.warning("Webhook secret not set; rejecting webhook")
            # 500 here is intentional so you notice in dev
            return _json_error("Webhook not configured", 500)

        # Verify signature & parse event
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=secret,
        )

        # Handle only the events we need
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]

            # Stripe guarantees metadata roundtrip
            metadata = session.get("metadata", {}) or {}
            mtype = metadata.get("type")
            bike_id = int(metadata.get("bike_id") or 0)
            owner_id = int(metadata.get("owner_id") or 0)

            # Extra safety: only mark paid sessions
            # (In test mode, 'payment_status' should be 'paid' after completion.)
            if session.get("payment_status") != "paid":
                current_app.logger.info("Webhook: session completed but not paid; ignoring.")
                return jsonify({"ok": True})

            bike = Bike.query.get(bike_id)
            if not bike:
                current_app.logger.error(f"Webhook: bike {bike_id} not found")
                return jsonify({"ok": True})

            # sanity: ownership mismatch is non-fatal (still honor the payment)
            if owner_id and bike.owner_id != owner_id:
                current_app.logger.warning(
                    f"Webhook: owner mismatch for bike {bike_id}: db={bike.owner_id} meta={owner_id}"
                )

            now = datetime.utcnow()
            if mtype == "listing":
                # Publish for 20 days
                bike.is_active = True
                bike.expires_at = now + timedelta(days=20)
            elif mtype == "renew":
                # Extend by 20 days from later of (now, existing expiry)
                base = bike.expires_at if bike.expires_at and bike.expires_at > now else now
                bike.is_active = True
                bike.expires_at = base + timedelta(days=20)
            else:
                current_app.logger.warning("Webhook: unknown metadata type %s", mtype)

            db.session.commit()

        # Always 200 OK so Stripe doesn’t keep retrying
        return jsonify({"ok": True})
    except Exception:
        current_app.logger.exception("Unhandled error in webhook")
        # Still 200 to avoid retry storms if bug persists during dev
        return jsonify({"ok": True})

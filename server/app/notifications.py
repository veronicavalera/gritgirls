# server/app/notifications.py
import os
from datetime import datetime, timedelta
from .models import db, Bike, User
from flask import Blueprint, jsonify
from sqlalchemy import and_

notifications_bp = Blueprint("notifications", __name__)

def _send_email_stub(to_email: str, subject: str, body: str):
    # Replace with real email (SendGrid, SES, Mailgun).
    # For now we just log to server console.
    print(f"[EMAIL] To={to_email}\nSubj={subject}\n\n{body}\n{'-'*60}")

@notifications_bp.post("/admin/send_renewal_emails")
def send_renewal_emails():
    """
    Find active bikes expiring in ~3 days and send a reminder once.
    You can schedule this endpoint daily with a cron (Render/Heroku/etc.).
    """
    now = datetime.utcnow()
    in_3_days = now + timedelta(days=3)
    in_4_days = now + timedelta(days=4)  # 24h window

    bikes = Bike.query.filter(
        and_(
            Bike.is_active == True,
            Bike.expires_at != None,
            Bike.expires_at >= in_3_days,
            Bike.expires_at <  in_4_days
        )
    ).all()

    for b in bikes:
        owner = User.query.get(b.owner_id)
        if not owner or not owner.email:
            continue
        subject = "Your GritGirls listing is expiring soon"
        body = (
            f"Hi!\n\nYour listing “{b.title}” will expire on {b.expires_at.date()}.\n"
            f"Renew for 20 more days here: {os.getenv('PUBLIC_SITE_URL', 'http://localhost:5173')}/pay/{b.id}\n\n"
            "Happy riding,\nGritGirls"
        )
        _send_email_stub(owner.email, subject, body)

    return jsonify({"ok": True, "notified": len(bikes)})

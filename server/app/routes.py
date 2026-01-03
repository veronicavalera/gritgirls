from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .models import Bike, Ride, UserProfile, RideAttendee, User
from . import db
import os
import re
from sqlalchemy import func

# -----------------------------------------------------------------------------
# Blueprint
# -----------------------------------------------------------------------------
api_bp = Blueprint("api", __name__)

# ---------------------------
# Basic health
# ---------------------------
@api_bp.get("/health")
def health():
    return jsonify({"ok": True})

# -----------------------------------------------------------------------------
# Helpers (pure functions; easy to unit test)
# -----------------------------------------------------------------------------
def _to_int(x):
    """Attempt to coerce a value to int; return None on any failure."""
    try:
        return int(str(x).strip())
    except Exception:
        return None

def _to_float(x):
    """Attempt to coerce a value to float; return None on any failure."""
    try:
        return float(str(x).strip())
    except Exception:
        return None

def _parse_frame_inches(size_text: str | None):
    """
    Extract a frame size in inches from a human string like '17.5"', '17"', '17 in'.
    Returns an int in a safe/expected range if found; otherwise None.
    """
    if not size_text:
        return None
    s = size_text.strip().lower().replace('”', '"')
    # Look for a two-digit number followed by optional in/" marker.
    m = re.search(r'\b(\d{2})\s*(?:in|")?\b', s)  # typical 14–30 range
    if m:
        v = int(m.group(1))
        if 14 <= v <= 30:
            return v
    return None

# --- Photo helpers: we store up to 3 URLs on the Bike model as photo1/2/3 ----
def _set_bike_photos(model: Bike, photos_list):
    """Assign up to 3 photo URLs onto model.photo1_url/photo2_url/photo3_url."""
    photos_list = photos_list or []
    urls = photos_list[:3] + [None, None, None]  # pad to 3
    model.photo1_url, model.photo2_url, model.photo3_url = urls[:3]

def _get_bike_photos(model: Bike):
    """Return a compact list of photo URLs that are present on the model."""
    return [u for u in [
        getattr(model, "photo1_url", None),
        getattr(model, "photo2_url", None),
        getattr(model, "photo3_url", None),
    ] if u]

def _delete_upload_file_if_local(url: str):
    """
    Best-effort cleanup helper. If the URL points to our local upload handler
    ("/api/uploads/<filename>"), remove the file from UPLOAD_DIR.
    - Swallows exceptions so delete operations don’t fail because of filesystem.
    - Validates the path to avoid deleting outside of UPLOAD_DIR.
    """
    try:
        if not url or not url.startswith("/api/uploads/"):
            return
        uploads_dir = current_app.config.get("UPLOAD_DIR")
        if not uploads_dir:
            return
        fname = url.rsplit("/", 1)[-1]
        path = os.path.join(uploads_dir, fname)
        # Safety: ensure resolved path remains inside UPLOAD_DIR
        if os.path.abspath(path).startswith(os.path.abspath(uploads_dir)) and os.path.exists(path):
            os.remove(path)
    except Exception:
        # Never block delete flow if cleanup fails
        pass

# -----------------------------------------------------------------------------
# Bikes
# -----------------------------------------------------------------------------
@api_bp.post("/bikes")
@jwt_required()
def create_bike():
    """
    Create a new bike listing as a DRAFT (is_active=False).
    - Requires auth: we set owner_id from the JWT.
    - Accepts core fields and an optional 'photos' list (URLs).
    - Normalizes numeric/text fields defensively.
    """
    data = request.get_json() or {}

    # Required field
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400

    # Owner from JWT
    owner_id = int(get_jwt_identity())

    # Normalize location fields
    state = (data.get("state") or "").strip().upper()[:2] or None

    # Prefer a clean 5-digit ZIP if provided
    z = (data.get("zip") or "").strip()
    zip_full = z[:5] if z.isdigit() and len(z) >= 5 else None

    # Frame size can be inferred from 'size' textual label when not given directly
    size_text = (data.get("size") or "").strip() or None
    frame_in = _to_int(data.get("frame_size_in")) or _parse_frame_inches(size_text)

    # Build the model (draft by default)
    b = Bike(
        # Card fields (brief summary for grid)
        title=title,
        brand=(data.get("brand") or "").strip() or None,
        model=(data.get("model") or "").strip() or None,
        year=_to_int(data.get("year")),
        size=size_text,
        price_usd=_to_int(data.get("price_usd")),
        state=state,

        # Detail fields (spec sheet)
        wheel_size=(data.get("wheel_size") or "").strip() or None,
        condition=(data.get("condition") or "").strip() or None,
        zip=zip_full,
        description=(data.get("description") or "").strip() or None,

        # Optional extras (numeric/safe conversions)
        frame_size_in=frame_in,
        rider_height_min_in=_to_int(data.get("rider_height_min_in")),
        rider_height_max_in=_to_int(data.get("rider_height_max_in")),
        bike_type=(data.get("bike_type") or "").strip() or None,
        frame_material=(data.get("frame_material") or "").strip() or None,
        drivetrain_rear=(data.get("drivetrain_rear") or "").strip() or None,
        brakes_model=(data.get("brakes_model") or "").strip() or None,
        saddle=(data.get("saddle") or "").strip() or None,
        weight_lb=_to_float(data.get("weight_lb")),

        owner_id=owner_id,
        is_active=False,   # stays draft until Stripe webhook publishes it
        expires_at=None,   # set upon publish/renew
    )

    # Save up to 3 optional photos
    photos = data.get("photos") or []
    _set_bike_photos(b, photos)

    db.session.add(b)
    db.session.commit()
    return jsonify(b.to_dict()), 201

@api_bp.get("/bikes")
def list_bikes():
    """
    Public index of ACTIVE, non-expired listings.
    - Filters out drafts and expired items.
    - Optional ?state=XX filter.
    - Sorted newest first.
    """
    q = Bike.query
    now = datetime.utcnow()

    # Only show active and not-yet-expired
    q = q.filter(Bike.is_active == True).filter(
        (Bike.expires_at == None) | (Bike.expires_at >= now)
    )

    # Optional state filter
    state = (request.args.get("state") or "").strip().upper()[:2]
    if state:
        q = q.filter(Bike.state == state)

    bikes = q.order_by(Bike.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bikes])

@api_bp.get("/bikes/mine")
@jwt_required()
def list_my_bikes():
    """
    Owner’s dashboard view.
    - Returns *all* the user’s listings (draft, active, expired).
    - Useful for managing renewals and edits.
    """
    uid = int(get_jwt_identity())
    bikes = Bike.query.filter_by(owner_id=uid).order_by(Bike.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bikes])

@api_bp.get("/bikes/<int:bike_id>")
def get_bike(bike_id: int):
    """
    Public detail view for a single listing (drafts are still fetchable by ID).
    - The client can decide what actions to allow based on ownership/active status.
    """
    bike = Bike.query.get(bike_id)
    if not bike:
        return jsonify({"error": "Bike not found"}), 404
    return jsonify(bike.to_dict())

@api_bp.put("/bikes/<int:bike_id>")
@jwt_required()
def update_bike(bike_id: int):
    """
    Owner-only partial update for a listing.
    - Accepts same fields as create, plus an optional full replacement of 'photos'.
    - Enforces non-empty title if provided.
    """
    b = Bike.query.get(bike_id)
    if not b:
        return jsonify({"error": "Bike not found"}), 404

    user_id = int(get_jwt_identity())
    if b.owner_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json() or {}

    # ---- Card fields
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"error": "title cannot be empty"}), 400
        b.title = title
    if "brand" in data: b.brand = (data.get("brand") or "").strip() or None
    if "model" in data: b.model = (data.get("model") or "").strip() or None
    if "year" in data: b.year = _to_int(data.get("year"))
    if "size" in data: b.size = (data.get("size") or "").strip() or None
    if "price_usd" in data: b.price_usd = _to_int(data.get("price_usd"))
    if "state" in data:
        s = (data.get("state") or "").strip().upper()[:2]
        b.state = s or None

    # ---- Detailed fields
    if "wheel_size" in data: b.wheel_size = (data.get("wheel_size") or "").strip() or None
    if "condition" in data: b.condition = (data.get("condition") or "").strip() or None
    if "zip" in data:
        z = (data.get("zip") or "").strip()
        b.zip = z[:5] if z.isdigit() and len(z) >= 5 else None
    if "description" in data: b.description = (data.get("description") or "").strip() or None

    # ---- Optional numeric/extras
    if "frame_size_in" in data:
        v = _to_int(data.get("frame_size_in"))
        # If not provided or invalid, try to infer again from size label
        b.frame_size_in = v if v is not None else _parse_frame_inches(b.size)
    if "rider_height_min_in" in data: b.rider_height_min_in = _to_int(data.get("rider_height_min_in"))
    if "rider_height_max_in" in data: b.rider_height_max_in = _to_int(data.get("rider_height_max_in"))
    if "bike_type" in data: b.bike_type = (data.get("bike_type") or "").strip() or None
    if "frame_material" in data: b.frame_material = (data.get("frame_material") or "").strip() or None
    if "drivetrain_rear" in data: b.drivetrain_rear = (data.get("drivetrain_rear") or "").strip() or None
    if "brakes_model" in data: b.brakes_model = (data.get("brakes_model") or "").strip() or None
    if "saddle" in data: b.saddle = (data.get("saddle") or "").strip() or None
    if "weight_lb" in data: b.weight_lb = _to_float(data.get("weight_lb"))

    # ---- Photos (replace entire set if supplied)
    if "photos" in data:
        photos = data.get("photos") or []
        _set_bike_photos(b, photos)

    db.session.commit()
    return jsonify(b.to_dict()), 200

@api_bp.delete("/bikes/<int:bike_id>")
@jwt_required()
def delete_bike(bike_id: int):
    """
    Owner-only delete.
    - Cleans up locally-uploaded files that were attached to this listing.
    """
    b = Bike.query.get(bike_id)
    if not b:
        return jsonify({"error": "Bike not found"}), 404

    user_id = int(get_jwt_identity())
    if b.owner_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    # Best-effort cleanup of uploaded files
    for u in _get_bike_photos(b):
        _delete_upload_file_if_local(u)

    db.session.delete(b)
    db.session.commit()
    return jsonify({"ok": True}), 200

# -----------------------------------------------------------------------------
# Rider directory (NEW)
# -----------------------------------------------------------------------------
@api_bp.get("/riders")
@jwt_required()
def rider_directory():
    """
    Directory from UserProfile joined to User.
    Filter by:
      - ?state=NJ
      - ?level=Beginner|Intermediate|Advanced
      - ?q= (search email or zip prefix)

    Returns:
      { total, results: [{ first_name, email, zip_prefix, state, experience_level }] }
    """
    state = (request.args.get("state") or "").strip().upper()[:2]
    level = (request.args.get("level") or "").strip()
    q = (request.args.get("q") or "").strip()

    # pagination
    try:
        limit = min(int(request.args.get("limit", 50)), 200)
    except ValueError:
        limit = 50
    try:
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        offset = 0

    query = (
        db.session.query(UserProfile, User)
        .join(User, User.id == UserProfile.user_id)
    )

    if state:
        query = query.filter(func.upper(UserProfile.state) == state)

    if level:
        query = query.filter(UserProfile.experience_level == level)

    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            db.or_(
                func.lower(User.email).like(like),
                func.lower(UserProfile.zip_prefix).like(like),
            )
        )

    total = query.count()

    rows = (
        query.order_by(User.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    results = []
    for prof, user in rows:
        # You don't currently store first_name; use email prefix for demo.
        first_name = (user.email.split("@")[0] if user.email else "")
        results.append(
            dict(
                user_id=user.id,
                first_name=first_name,
                email=user.email,
                zip_prefix=prof.zip_prefix,
                state=prof.state,
                experience_level=prof.experience_level,
                level=prof.experience_level,  # alias so frontends can use either key
            )
        )

    return jsonify({"total": total, "results": results}), 200

# -----------------------------------------------------------------------------
# Rides
# -----------------------------------------------------------------------------
@api_bp.get("/rides/<int:ride_id>")
@jwt_required(optional=True)
def ride_detail(ride_id):
    """
    Public ride detail. If the requester is the ride owner (JWT present and
    matches), include attendee emails in the response for management purposes.
    """
    ride = Ride.query.get(ride_id)
    if not ride:
        return jsonify({"error": "Ride not found"}), 404

    current_user_id = get_jwt_identity()
    include_attendees = (current_user_id is not None and ride.owner_id == int(current_user_id))
    return jsonify(ride.to_dict(include_attendees=include_attendees)), 200

@api_bp.post("/rides/<int:ride_id>/rsvp")
@jwt_required()
def rsvp_toggle(ride_id):
    """
    Toggle RSVP for the current user.
    - If already RSVP’d → remove (200).
    - If not RSVP’d → add (201).
    """
    ride = Ride.query.get(ride_id)
    if not ride:
        return jsonify({"error": "Ride not found"}), 404

    user_id = int(get_jwt_identity())

    existing = RideAttendee.query.filter_by(ride_id=ride_id, user_id=user_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"ok": True, "status": "removed"}), 200
    else:
        db.session.add(RideAttendee(ride_id=ride_id, user_id=user_id))
        db.session.commit()
        return jsonify({"ok": True, "status": "added"}), 201

@api_bp.get("/rides")
def list_rides():
    """
    Public list of rides (optionally filter by state).
    - Sorted soonest first (date/time ascending).
    - Each ride dict carries attendee_count.
    """
    state = (request.args.get("state") or "").strip().upper()[:2]
    q = Ride.query
    if state:
        q = q.filter(Ride.state == state)
    rides = q.order_by(Ride.date.asc(), Ride.time.asc()).all()
    return jsonify([r.to_dict() for r in rides])

@api_bp.post("/rides")
@jwt_required()
def create_ride():
    """
    Create a new ride (requires auth).
    - title and date are required (date is ISO 'YYYY-MM-DD').
    - owner_id set from JWT.
    """
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    date = (data.get("date") or "").strip()   # "YYYY-MM-DD"
    if not title or not date:
        return jsonify({"error": "title and date are required"}), 400
    state = (data.get("state") or "").strip().upper()[:2] or None

    r = Ride(
        title=title,
        date=datetime.fromisoformat(date).date(),  # store as date object
        time=(data.get("time") or "").strip() or None,
        difficulty=(data.get("difficulty") or "").strip() or None,
        terrain=(data.get("terrain") or "").strip() or None,
        zip_prefix=(data.get("zip_prefix") or "").strip()[:3] or None,
        state=state,
        description=(data.get("description") or "").strip() or None,
        owner_id=int(get_jwt_identity())
    )
    db.session.add(r)
    db.session.commit()
    return jsonify(r.to_dict()), 201

# -----------------------------------------------------------------------------
# Profile
# -----------------------------------------------------------------------------
@api_bp.get("/profile")
@jwt_required()
def get_profile():
    """
    Fetch the current user's profile.
    - If it doesn’t exist yet, create an empty profile automatically.
    """
    user_id = int(get_jwt_identity())
    prof = UserProfile.query.filter_by(user_id=user_id).first()
    if not prof:
        # Auto-create an empty profile on first access
        prof = UserProfile(user_id=user_id)
        db.session.add(prof)
        db.session.commit()
    return jsonify(prof.to_dict())

@api_bp.put("/profile")
@jwt_required()
def update_profile():
    """
    Upsert profile fields for the current user (basic normalization included).
    - Keeps inputs resilient to empty strings vs None.
    - Uppercases state; truncates zip_prefix to 5 chars.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    prof = UserProfile.query.filter_by(user_id=user_id).first()
    if not prof:
        prof = UserProfile(user_id=user_id)
        db.session.add(prof)

    # Normalize and assign fields
    prof.age = int(data.get("age")) if data.get("age") not in (None, "",) else None

    state = (data.get("state") or "").strip().upper()
    prof.state = state[:2] or None

    zp = (data.get("zip_prefix") or "").strip()
    prof.zip_prefix = zp[:5] or None

    prof.experience_level = (data.get("experience_level") or "").strip() or None
    prof.bike = (data.get("bike") or "").strip() or None
    prof.phone = (data.get("phone") or "").strip() or None
    prof.contact_email = (data.get("contact_email") or "").strip() or None

    db.session.commit()
    return jsonify(prof.to_dict()), 200

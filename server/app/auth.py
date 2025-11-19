from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from .models import User
from . import db

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/signup")
def signup():
    # Parse JSON body (or use empty dict if none sent)
    data = request.get_json() or {}

    # Normalize inputs: trim spaces and lowercase email; default password to ""
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Basic validation: both fields required
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    # Uniqueness check: prevent duplicate registrations by email
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 400

    # Create the user record and hash the password
    u = User(email=email)
    u.set_password(password)  # typically uses a salted hash (e.g., werkzeug.security)

    # Persist the new user to the database
    db.session.add(u)
    db.session.commit()

    # Create a JWT access token; identity is the user's id (as string)
    token = create_access_token(identity=str(u.id))

    # Return the token and a safe user representation
    return jsonify({"access_token": token, "user": u.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    u = User.query.filter_by(email=email).first()
    if not u or not u.check_password(password):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_access_token(identity=str(u.id))
    return jsonify({"access_token": token, "user": u.to_dict()})

@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    u = db.session.get(User, int(user_id))
    return jsonify({"user": u.to_dict()})

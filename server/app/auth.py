from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from .models import User
from . import db

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/signup")
def signup():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 400

    u = User(email=email)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()

    token = create_access_token(identity=str(u.id))
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

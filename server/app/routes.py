from flask import Blueprint, jsonify
from .models import Bike

api_bp = Blueprint("api", __name__)

@api_bp.get("/health")
def health():
    return jsonify({"ok": True})

@api_bp.get("/bikes")
def list_bikes():
    bikes = Bike.query.order_by(Bike.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bikes])

@api_bp.get("/bikes/<int:bike_id>")
def get_bike(bike_id: int):
    bike = Bike.query.get(bike_id)
    if not bike:
        return jsonify({"error": "Bike not found"}), 404
    return jsonify(bike.to_dict())

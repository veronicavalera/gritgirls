from flask import Blueprint, current_app, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
import os, uuid
from mimetypes import guess_type

files_bp = Blueprint("files", __name__)

ALLOWED_EXTS = {"jpg", "jpeg", "png", "webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5MB

def _allowed(filename: str) -> bool:
    ext = (filename.rsplit(".", 1)[-1] or "").lower()
    return ext in ALLOWED_EXTS

@files_bp.post("/uploads/image")
@jwt_required()
def upload_image():
    if "file" not in request.files:
        return jsonify({"error": "No file field"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "No selected file"}), 400
    if not _allowed(f.filename):
        return jsonify({"error": "Only jpg, jpeg, png, webp allowed"}), 400

    # size check (works for most clients; also protects on save)
    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    if size > MAX_BYTES:
        return jsonify({"error": "File too large (max 5MB)"}), 400

    # unique name
    ext = f.filename.rsplit(".", 1)[-1].lower()
    fname = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(current_app.config["UPLOAD_DIR"], secure_filename(fname))
    f.save(path)

    # Return a stable API-served URL (same origin)
    url = f"/api/uploads/{fname}"
    return jsonify({"url": url}), 201

@files_bp.get("/uploads/<path:filename>")
def serve_upload(filename):
    # basic content-type
    mime, _ = guess_type(filename)
    return send_from_directory(current_app.config["UPLOAD_DIR"], filename, mimetype=mime)

@files_bp.delete("/uploads/<path:filename>")
@jwt_required()
def delete_upload(filename):
    # Only allow deleting files in the uploads dir
    uploads_dir = current_app.config["UPLOAD_DIR"]
    path = os.path.join(uploads_dir, filename)
    # Basic safety: ensure the path stays inside uploads_dir
    if not os.path.abspath(path).startswith(os.path.abspath(uploads_dir)):
        return jsonify({"error": "Invalid path"}), 400
    if not os.path.exists(path):
        return jsonify({"ok": True, "status": "not_found"}), 200
    try:
        os.remove(path)
    except OSError as e:
        return jsonify({"error": f"Could not delete: {e}"}), 500
    return jsonify({"ok": True, "status": "deleted"}), 200

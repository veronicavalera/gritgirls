# server/app/uploads.py
from flask import Blueprint, current_app, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
import os, uuid  # uuid gives us collision-resistant filenames
from mimetypes import guess_type  # best-guess Content-Type based on filename extension

# Blueprint that owns all "uploads" routes.
files_bp = Blueprint("files", __name__)

# Acceptable image file extensions and a size cap (5 MB)
ALLOWED_EXTS = {"jpg", "jpeg", "png", "webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5MB

def _allowed(filename: str) -> bool:
    """
    Return True if the file's extension is one of the allowed types.
    We only check the *extension* here for speed; server-side size/type
    checks still follow.
    """
    ext = (filename.rsplit(".", 1)[-1] or "").lower()
    return ext in ALLOWED_EXTS

@files_bp.post("/uploads/image")
@jwt_required()
def upload_image():
    """
    Securely accept an image upload (auth required), save it to UPLOAD_DIR,
    and return a same-origin URL that the frontend can display.

    Request: multipart/form-data with a "file" field.
    Response: 201 + {"url": "/api/uploads/<filename>"} on success.
    """
    # Ensure the form has the expected field
    if "file" not in request.files:
        return jsonify({"error": "No file field"}), 400

    f = request.files["file"]

    # Reject empty selection (e.g., user clicks cancel)
    if not f.filename:
        return jsonify({"error": "No selected file"}), 400

    # Quick extension allowlist check before we do anything else
    if not _allowed(f.filename):
        return jsonify({"error": "Only jpg, jpeg, png, webp allowed"}), 400

    # Soft size check: move pointer to end to measure, then reset.
    # (Many servers/clients enforce limits earlier, but this protects on save, too.)
    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    if size > MAX_BYTES:
        return jsonify({"error": "File too large (max 5MB)"}), 400

    # Create a unique, safe filename: <uuid>.<ext>
    ext = f.filename.rsplit(".", 1)[-1].lower()
    fname = f"{uuid.uuid4().hex}.{ext}"

    # secure_filename strips dangerous characters; join with configured upload dir
    path = os.path.join(current_app.config["UPLOAD_DIR"], secure_filename(fname))

    # Persist the file bytes to disk
    f.save(path)

    # Return a stable API URL (same origin) that your frontend can fetch/display
    url = f"/api/uploads/{fname}"
    return jsonify({"url": url}), 201

@files_bp.get("/uploads/<path:filename>")
def serve_upload(filename):
    """
    Serve a previously uploaded file from UPLOAD_DIR.
    Uses guess_type to set a reasonable Content-Type (e.g., image/jpeg).
    """
    mime, _ = guess_type(filename)
    return send_from_directory(
        current_app.config["UPLOAD_DIR"],
        filename,
        mimetype=mime
    )

@files_bp.delete("/uploads/<path:filename>")
@jwt_required()
def delete_upload(filename):
    """
    Delete a file in the uploads directory (auth required).
    Idempotent: returns ok/not_found if the file is already gone.
    Includes a simple path traversal guard.
    """
    uploads_dir = current_app.config["UPLOAD_DIR"]
    path = os.path.join(uploads_dir, filename)

    # Guard against path traversal: ensure resolved path stays under UPLOAD_DIR
    if not os.path.abspath(path).startswith(os.path.abspath(uploads_dir)):
        return jsonify({"error": "Invalid path"}), 400

    # If it's already gone, treat as success (helps clean up UI state)
    if not os.path.exists(path):
        return jsonify({"ok": True, "status": "not_found"}), 200

    # Attempt deletion; report OS errors
    try:
        os.remove(path)
    except OSError as e:
        return jsonify({"error": f"Could not delete: {e}"}), 500

    return jsonify({"ok": True, "status": "deleted"}), 200

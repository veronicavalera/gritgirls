# server/app/__init__.py
from pathlib import Path
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

# creates a global SQLAlchemy handle that will be bound to a Flask app later
db = SQLAlchemy()

def create_app():
    # loads secrets from .env (Stripe keys, JWT secret, etc.) into os.environ.
    load_dotenv()

    app = Flask(__name__)

    # -------------------------------------------------------------------------
    # DATABASE CONFIG
    # -------------------------------------------------------------------------
    # Priority:
    #  1) DATABASE_URL (Render Postgres or any external DB)
    #  2) SQLITE_PATH (Render disk path, e.g. /var/data/dev.db)
    #  3) Local default dev.db at repo root
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    else:
        sqlite_path = os.getenv("SQLITE_PATH")  # e.g. "/var/data/dev.db" on Render
        if sqlite_path:
            app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sqlite_path}"
        else:
            BASE_DIR = Path(__file__).resolve().parents[2]  # gritgirls/
            DB_PATH = BASE_DIR / "dev.db"
            app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # -------------------------------------------------------------------------
    # UPLOADS CONFIG (PERSISTENT DISK FRIENDLY)
    # -------------------------------------------------------------------------
    # Priority:
    #  1) UPLOAD_DIR (Render disk path, e.g. /var/data/uploads)
    #  2) Local default uploads/ at repo root
    BASE_DIR = Path(__file__).resolve().parents[2]  # gritgirls/
    uploads_root = os.getenv("UPLOAD_DIR")  # e.g. "/var/data/uploads"
    if uploads_root:
        UPLOAD_DIR = Path(uploads_root)
    else:
        UPLOAD_DIR = BASE_DIR / "uploads"

    UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
    app.config["UPLOAD_DIR"] = str(UPLOAD_DIR)

    # -------------------------------------------------------------------------
    # CORS (LOCAL + PROD)
    # -------------------------------------------------------------------------
    frontend_origin = os.getenv("FRONTEND_ORIGIN")  # e.g. "https://your-site.onrender.com"

    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    if frontend_origin:
        origins.append(frontend_origin)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
        supports_credentials=False,
    )

    # -------------------------------------------------------------------------
    # JWT
    # -------------------------------------------------------------------------
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-insecure-change-me")
    JWTManager(app)

    # -------------------------------------------------------------------------
    # DB + BLUEPRINTS
    # -------------------------------------------------------------------------
    db.init_app(app)

    with app.app_context():
        from . import models
        db.create_all()

        from .routes import api_bp
        app.register_blueprint(api_bp, url_prefix="/api")

        from .uploads import files_bp
        app.register_blueprint(files_bp, url_prefix="/api")

        from .payments import payments_bp
        app.register_blueprint(payments_bp, url_prefix="/api")

        from .auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api/auth")

    return app

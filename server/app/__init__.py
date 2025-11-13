# server/app/__init__.py
from pathlib import Path
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv  # <-- ADD
import os

db = SQLAlchemy()

def create_app():
    load_dotenv()  # <-- ADD: loads your .env

    app = Flask(__name__)

    # Absolute path to dev.db at the repo root
    BASE_DIR = Path(__file__).resolve().parents[2]  # gritgirls/
    DB_PATH = BASE_DIR / "dev.db"
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # uploads dir (you already had this)
    UPLOAD_DIR = BASE_DIR / "uploads"
    UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
    app.config["UPLOAD_DIR"] = str(UPLOAD_DIR)

    # CORS (keep your ports, including 5173/5174)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5174",
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
        supports_credentials=False,  # must be here (top-level)
    )

    db.init_app(app)

    # JWT secret (dev fallback if env not set)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-insecure-change-me")
    jwt = JWTManager(app)

    with app.app_context():
        from . import models
        db.create_all()

        from .routes import api_bp
        app.register_blueprint(api_bp, url_prefix="/api")

        from .uploads import files_bp
        app.register_blueprint(files_bp, url_prefix="/api")

        # <-- ADD THIS: register payments endpoints
        from .payments import payments_bp
        app.register_blueprint(payments_bp, url_prefix="/api")

        from .auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api/auth")

    return app


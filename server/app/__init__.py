# Flask app factory- builds and wires the entire backend 
# in one place so tests, dev, and prod can all create 
# the same app instance cleanly.
# sources: https://www.geeksforgeeks.org/python/what-is-__init__-py-file-in-python/

# server/app/__init__.py
from pathlib import Path
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv  # <-- ADD
import os

# creates a global SQLAlchemy handle that will be bound to a Flask app later
db = SQLAlchemy()

def create_app():
    # loads secrets from .env (Stripe keys, JWT secret, etc.) into os.environ. 
    # This keeps secrets out of source code.
    load_dotenv()  

    # create Flask app instance 
    app = Flask(__name__)

    # Absolute path to dev.db at the repo root
    # Resolves the repo root and stores SQLite at gritgirls/dev.db
    BASE_DIR = Path(__file__).resolve().parents[2]  # gritgirls/
    DB_PATH = BASE_DIR / "dev.db"
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # uploads dir 
    UPLOAD_DIR = BASE_DIR / "uploads"
    UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
    app.config["UPLOAD_DIR"] = str(UPLOAD_DIR)

    # CORS (keep ports, including 5173/5174)
    # Allows Vite dev server (localhost:5173) to call /api/*
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

    # binds SQLAlchemy to this app instance
    db.init_app(app)

    # JWT secret (dev fallback if env not set)
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-insecure-change-me")
    jwt = JWTManager(app)

    # Imports models so SQLAlchemy knows the tables, 
    # then db.create_all() creates tables (handy for dev/tests).
    # blueprints for routes, uploads, payments, and auth api endpoints
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


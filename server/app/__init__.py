from pathlib import Path
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    # Absolute path to dev.db at the repo root
    BASE_DIR = Path(__file__).resolve().parents[2]  # gritgirls/
    DB_PATH = BASE_DIR / "dev.db"
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # allows react dev site to call api
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": False,
        }
    })

    db.init_app(app)

    with app.app_context():
        from . import models  # so that SQLAlchemy knows the tables
        db.create_all()
        from .routes import api_bp
        app.register_blueprint(api_bp, url_prefix="/api")

    return app

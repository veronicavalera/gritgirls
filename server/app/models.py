from datetime import datetime
from . import db

from werkzeug.security import generate_password_hash, check_password_hash


# schema for your data; how bikes are stored
class Bike(db.Model):
    __tablename__ = "bikes"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(140), nullable=False)
    brand = db.Column(db.String(80))
    model = db.Column(db.String(80))
    year = db.Column(db.String(8))
    size = db.Column(db.String(8))          # S/M/L etc.
    wheel_size = db.Column(db.String(8))    # 27.5 / 29
    condition = db.Column(db.String(16))    # New/Good/Fair
    price_usd = db.Column(db.Integer)       # store in whole dollars
    zip_prefix = db.Column(db.String(3))    # safety (first 3 of ZIP)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "brand": self.brand,
            "model": self.model,
            "year": self.year,
            "size": self.size,
            "wheel_size": self.wheel_size,
            "condition": self.condition,
            "price_usd": self.price_usd,
            "zip_prefix": self.zip_prefix,
            "created_at": self.created_at.isoformat(),
        }
    
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw: str):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "created_at": self.created_at.isoformat()}


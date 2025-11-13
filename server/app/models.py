from . import db
from sqlalchemy import UniqueConstraint
from datetime import datetime, timedelta
from sqlalchemy.dialects.sqlite import JSON


from werkzeug.security import generate_password_hash, check_password_hash

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

class UserProfile(db.Model):
    __tablename__ = "user_profile"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    # Profile fields (all optional for MVP)
    age = db.Column(db.Integer)
    state = db.Column(db.String(2))          # e.g., "NJ"
    zip_prefix = db.Column(db.String(5))     # allow 3–5 for safety
    experience_level = db.Column(db.String(50))  # Beginner/Intermediate/Advanced
    bike = db.Column(db.String(120))         # what you ride
    phone = db.Column(db.String(30))
    contact_email = db.Column(db.String(120))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return dict(
            id=self.id,
            user_id=self.user_id,
            age=self.age,
            state=self.state,
            zip_prefix=self.zip_prefix,
            experience_level=self.experience_level,
            bike=self.bike,
            phone=self.phone,
            contact_email=self.contact_email,
            created_at=self.created_at.isoformat() if self.created_at else None,
            updated_at=self.updated_at.isoformat() if self.updated_at else None,
        )

# schema for your data; how bikes are stored
# Bike model: add owner_id and state
class Bike(db.Model):
    __tablename__ = "bike"
    id = db.Column(db.Integer, primary_key=True)

    # CARD fields (list view)
    title = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100))
    model = db.Column(db.String(100))
    year = db.Column(db.Integer)
    size = db.Column(db.String(20))          # free-text label (e.g., S/M/52)
    price_usd = db.Column(db.Integer)
    state = db.Column(db.String(2))          # e.g., "NJ"
    

    # DETAILS fields (detail view page)
    wheel_size = db.Column(db.String(20))
    condition = db.Column(db.String(20))
    zip = db.Column(db.String(5))            # full 5-digit ZIP
    description = db.Column(db.Text)

    # OPTIONAL extras
    frame_size_in = db.Column(db.Integer)    # numeric inches
    rider_height_min_in = db.Column(db.Integer)
    rider_height_max_in = db.Column(db.Integer)
    bike_type = db.Column(db.String(20))     # Road/Gravel/MTB/Hybrid/Other
    frame_material = db.Column(db.String(30))
    drivetrain_rear = db.Column(db.String(120))
    brakes_model = db.Column(db.String(120))
    saddle = db.Column(db.String(120))
    weight_lb = db.Column(db.Float)

    photo1_url = db.Column(db.String(500))
    photo2_url = db.Column(db.String(500))
    photo3_url = db.Column(db.String(500))

    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    owner = db.relationship("User", lazy="joined")

    # NEW: payment/listing lifecycle
    is_active = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    stripe_listing_session = db.Column(db.String(120), nullable=True)
    stripe_last_renew_session = db.Column(db.String(120), nullable=True)

    def to_dict(self):
        photos = [p for p in [self.photo1_url, self.photo2_url, self.photo3_url] if p]
        return dict(
            # Card fields
            id=self.id,
            title=self.title,
            brand=self.brand,
            model=self.model,
            year=self.year,
            size=self.size,
            price_usd=self.price_usd,
            state=self.state,

            # Details fields
            wheel_size=self.wheel_size,
            condition=self.condition,
            zip=self.zip,
            description=self.description,

            # Optional
            owner_id=self.owner_id,
            owner_email=self.owner.email if self.owner else None,
            frame_size_in=self.frame_size_in,
            rider_height_min_in=self.rider_height_min_in,
            rider_height_max_in=self.rider_height_max_in,
            bike_type=self.bike_type,
            frame_material=self.frame_material,
            drivetrain_rear=self.drivetrain_rear,
            brakes_model=self.brakes_model,
            saddle=self.saddle,
            weight_lb=self.weight_lb,

            photos=photos,

            created_at=self.created_at.isoformat() if self.created_at else None,
            is_active=self.is_active,
            expires_at=self.expires_at.isoformat() if self.expires_at else None,

        )


class RideAttendee(db.Model):
    __tablename__ = "ride_attendee"
    id = db.Column(db.Integer, primary_key=True)
    ride_id = db.Column(db.Integer, db.ForeignKey("ride.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("ride_id", "user_id", name="uq_ride_user"),
    )

# In your Ride model, add relationships (if not already present):
class Ride(db.Model):

    __tablename__ = "ride"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.String(10))
    difficulty = db.Column(db.String(50))
    terrain = db.Column(db.String(100))
    zip_prefix = db.Column(db.String(3))
    state = db.Column(db.String(2))          # <-- NEW
    description = db.Column(db.Text)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


    owner = db.relationship("User", backref="rides_owned")
    attendees = db.relationship(
        "User",
        secondary="ride_attendee",
        backref="rides_joined",
        lazy="selectin",
    )

    def to_dict(self, include_attendees=False):
        data = dict(
            id=self.id,
            title=self.title,
            date=self.date.isoformat() if self.date else None,
            time=self.time,
            difficulty=self.difficulty,
            terrain=self.terrain,
            state=self.state,
            zip_prefix=self.zip_prefix,
            description=self.description,
            owner_id=self.owner_id,
            attendee_count=len(self.attendees) if self.attendees is not None else 0,
        )
        if include_attendees:
            data["attendees"] = [
                {"id": u.id, "email": u.email} for u in self.attendees
            ]
        return data
    
class Payment(db.Model):
    __tablename__ = "payment"
    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(20), nullable=False)  # "listing" or "renewal"
    bike_id = db.Column(db.Integer, db.ForeignKey("bike.id"), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    stripe_session_id = db.Column(db.String(120), unique=True, nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    
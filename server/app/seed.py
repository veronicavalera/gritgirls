from . import db
from .models import Bike

def seed():
    if Bike.query.count() == 0:
        db.session.add_all([
            Bike(
                title="Juliana Roubion (S)",
                brand="Juliana",
                model="Roubion",
                year="2019",
                size="S",
                wheel_size="27.5",
                condition="Good",
                price_usd=1800,
                zip_prefix="07044",
            ),
            Bike(
                title="Liv Pique (M) 29er",
                brand="Liv",
                model="Pique",
                year="2021",
                size="M",
                wheel_size="29",
                condition="Good",
                price_usd=2200,
                zip_prefix="07044",
            ),
        ])
        db.session.commit()

if __name__ == "__main__":
    # run with: python -m server.app.seed (from repo root, venv active)
    from flask import Flask
    from . import create_app
    app: Flask = create_app()
    with app.app_context():
        seed()
        print("Seeded 2 bikes.")

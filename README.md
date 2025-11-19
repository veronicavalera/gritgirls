# GritGirls

- Frontend: Vite + React (`client/`)
- Backend: Flask + SQLAlchemy (`server/`)
- Dev servers:
  - API: http://127.0.0.1:8000
  - UI:  http://localhost:5173

## Quick start
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt   # when you add one
python server/run.py

cd client
npm install
npm run dev

# GritGirls

A community platform for women in mountain biking—combining a **used-bike marketplace**, **group ride RSVPs**, and a **rider directory**. Built with a lightweight **Flask + SQLAlchemy** backend and a **React (Vite)** front-end, with **JWT auth** and **Stripe** checkout for listing fees and renewals.

## 🌟 Features

- **Marketplace (Bikes)**
  - Create a draft listing with up to 3 photos
  - Pay **$10** via Stripe to publish
  - 20-day visibility window; **$3** renewal extends visibility
  - Owner-only edit/delete
- **Group Rides**
  - Create and browse rides
  - RSVP toggle (auth required)
  - Owner can view attendee emails
- **Auth & Profiles**
  - Email/password signup + login (JWT)
  - Profile page shows your listings and rides
- **Nice UX touches**
  - Clean, light UI kit (cards, inputs, soft buttons)
  - Image upload with size checks, deletion, and a simple carousel on detail pages
  - State filters for bikes/rides

## 🏗️ Tech Stack

- **Frontend:** React 18, Vite, React Router
- **Backend:** Python 3.11, Flask, SQLAlchemy, Flask-JWT-Extended, Stripe SDK
- **Storage/DB:** SQLite (local dev)
- **Payments:** Stripe Checkout + Webhooks (listing publish, renewal)
- **Tests:** pytest


## Description: 
GritGirls is a community platform for women in mountain biking that combines a used-bike marketplace, group ride RSVPs, and a rider directory. It uses a lightweight Flask + SQLAlchemy backend and a React (Vite) front end, with JWT authentication and Stripe Checkout for listing fees and renewals. Features include: Marketplace (create draft listings with up to 3 photos; pay $10 via Stripe to publish; 20-day visibility window; $3 renewal extends visibility; owner-only edit/delete), Group Rides (create and browse rides, RSVP toggle with auth, owner can view attendee emails), Auth & Profiles (email/password signup + login via JWT, profile page shows your listings and rides), and UX touches like a clean light UI kit (cards, inputs, soft buttons), image upload with size checks and deletion, a simple carousel on detail pages, and state filters for bikes and rides. The tech stack consists of React 18, Vite, and React Router for the front end; Python 3.11, Flask, SQLAlchemy, Flask-JWT-Extended, and the Stripe SDK for the backend; SQLite for local development; Stripe Checkout plus Webhooks for payments; and pytest for tests. 

# Local Setup
To set up locally, first configure the backend: `cd server && python -m venv ../.venv && source ../.venv/bin/activate && pip install -r requirements.txt`. 

Create a `server/.env` file with: `FLASK_ENV=development`, `JWT_SECRET_KEY=dev-super-secret`, `DATABASE_URL=sqlite:///gritgirls.db`, `API_BASE_URL=http://127.0.0.1:8000`, `PUBLIC_SITE_URL=http://localhost:5173`, `STRIPE_SECRET_KEY=sk_test_********************************`, and `STRIPE_WEBHOOK_SECRET=whsec_********************************`. 

Run the API with `python run.py` (it serves at `http://127.0.0.1:8000`). 

Then set up the frontend: `cd client && npm install && npm run dev` (the app serves at `http://localhost:5173`). 

For Stripe in development, install the Stripe CLI, run `stripe login`, and forward webhooks with `stripe listen --forward-to http://127.0.0.1:8000/api/stripe/webhook`; copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` in `server/.env`. Use Stripe’s test cards (e.g., `4242 4242 4242 4242` with any future expiry and any CVC) to simulate successful payments. 

A typical run-through is: sign up and log in; create a bike (draft) with photos; click Pay $10 to Post to complete Stripe Checkout; upon success the listing becomes active for 20 days; you can renew for $3 before or after expiry to extend visibility by 20 days; browse bikes at `/bikes`, filter by state, and open a listing with the image carousel; create rides at `/rides/new`, RSVP from the list, and view attendees as the owner. 


# Testing
To run the tests: from the project root, `source .venv/bin/activate && pytest server/tests -q`. The suite covers auth signup/login; bike create/fetch/edit/delete plus visibility and expiry filtering; starting a Stripe checkout session; webhook flow that publishes a listing after successful payment; and (optionally) rides create/list and RSVP depending on your current code.

# Notes
Environment variables summary: `JWT_SECRET_KEY` (server; signs/verifies JWTs), `DATABASE_URL` (server; SQLAlchemy connection string), `API_BASE_URL` (both; API origin used for CORS and redirects), `PUBLIC_SITE_URL` (both; frontend origin used for CORS and redirects), `STRIPE_SECRET_KEY` (server; secret Stripe API key), `STRIPE_WEBHOOK_SECRET` (server; verifies webhook signatures), and `VITE_API_URL` (client; where the frontend calls the API, defaults to `http://127.0.0.1:8000` but set it in `client/.env` for deployment). 

Deployment notes: host the backend on a service like Render/Fly/Heroku and set the environment variables; use persistent storage or a managed database; expose something like `https://api.example.com`. Host the frontend on Render static hosting; build with `npm run build`; set `VITE_API_URL=https://api.example.com`. Configure the Stripe webhook endpoint in the Stripe Dashboard (`https://api.example.com/api/stripe/webhook`) and use the live webhook secret. 

For CORS in production, ensure the Flask app allows your frontend origin via `PUBLIC_SITE_URL`. 

Security and privacy stance: JWT stored in memory and sent via `Authorization: Bearer ...`; passwords are hashed using standard Flask/Werkzeug practices; payment details never touch our servers because Stripe hosts the checkout; server-side checks enforce owner-only mutations on listings. 

Accessibility and UX notes: buttons use clear variants (solid, soft, outline); inputs have labels and hints; the image carousel supports keyboard navigation with left/right arrows; the light theme uses high-contrast defaults with consistent card layouts. A short roadmap includes email reminders 3 days before listing expiry (cron plus transactional email), richer profile pages, better bike/ride search and sort, a photo cropping/thumbnailing pipeline, and S3-backed uploads. Contributions are welcome—keep code style consistent, write focused tests, and favor simple, clear UX. The project can be licensed under MIT (add a `LICENSE` file if publishing publicly). If you hit setup snags, check the environment variables and “gotchas” above; that solves the majority of issues quickly.



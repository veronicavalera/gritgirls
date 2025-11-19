// client/src/pages/BikeDetail.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// Backend base URL; falls back to local dev if Vite env isn't set
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Convert relative file paths from the API into absolute URLs for <img src="">
function fullUrl(u) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API}${u}`;
}

// Display 66 inches as 5'6" (purely for nicer UI)
function inchesToFeet(inches) {
  if (inches == null) return null;
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

export default function BikeDetail() {
  // Pull :id from /bikes/:id
  const { id } = useParams();
  const navigate = useNavigate();

  // Logged-in user + token from global auth context
  const { token, userEmail } = useAuth();

  // Local view state
  const [bike, setBike] = useState(null);   // current listing (or null while loading)
  const [err, setErr] = useState("");       // last error string to show
  const [saving, setSaving] = useState(false); // for disabling Delete while posting

  // --- Carousel state ---
  // NOTE: Safely compute photos to avoid undefined/falsey crashes.
  // https://uploadcare.com/blog/how-to-upload-file-in-react/
  const photos = Array.isArray(bike?.photos) ? bike.photos : [];
  const [idx, setIdx] = useState(0);

  // If photos change (e.g., after edit) and idx points outside, reset to first
  useEffect(() => {
    if (idx >= photos.length) setIdx(0);
  }, [photos.length, idx]);

  // Fetch the bike on mount and whenever the :id param changes
  useEffect(() => {
    (async () => {
      try {
        setErr(""); // clear any prior error before a new fetch
        const res = await fetch(`${API}/api/bikes/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setBike(data);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [id]);

  // Prev/Next handlers wrap around; useCallback prevents re-creating handlers on every render
  const goPrev = useCallback(() => {
    if (photos.length === 0) return;
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    if (photos.length === 0) return;
    setIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);

  // Keyboard support for carousel (← and →)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  // Handle loading and fetch errors early
  if (err) return <div className="card">Error: {err}</div>;
  if (!bike) return <div className="card">Loading…</div>;

  // --- Ownership & visibility logic for the action buttons/banner ---
  const isOwner = !!userEmail && bike.owner_email === userEmail;
  const expiresAt = bike.expires_at ? new Date(bike.expires_at) : null;
  const isExpired = !!expiresAt && expiresAt < new Date();

  // Owner-only destructive action: Delete listing
  async function onDelete() {
    if (!token) return setErr("Please log in.");
    const ok = window.confirm("Delete this listing? This cannot be undone.");
    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/bikes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }, // WHY: server needs to verify you own the listing
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      navigate("/bikes"); // back to listings on success
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Nicely formatted rider height range, only if both ends are present
  const heightRange =
    bike.rider_height_min_in && bike.rider_height_max_in
      ? `${inchesToFeet(bike.rider_height_min_in)} – ${inchesToFeet(bike.rider_height_max_in)}`
      : null;

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <Link to="/bikes" style={{ fontSize: 14 }}>&larr; Back to Bikes</Link>

      {/* --- Status banner (draft/active/expired) --- */}
      {/* WHY: This makes the state of the listing obvious and groups owner actions together. */}
      <div
        className="card"
        style={{
          background: "var(--ui-brand-weak)",
          borderColor: "var(--ui-brand)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{bike.title}</div>
          <div style={{ fontSize: 13, color: "var(--ui-subtle)" }}>
            {bike.is_active ? (
              isExpired ? (
                <>Status: <strong>Expired</strong> — renew to make it visible again.</>
              ) : (
                <>
                  Status: <strong>Active</strong>
                  {expiresAt && <> • Expires on <strong>{expiresAt.toLocaleDateString()}</strong></>}
                </>
              )
            ) : (
              <>Status: <strong>Draft</strong> — pay to publish your listing.</>
            )}
          </div>
        </div>

        {/* Owner-only actions: Edit, Pay/Renew, Delete */}
        {isOwner && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Edit → go to the full edit form (reuses your create form UI) */}
            <Link to={`/bikes/${bike.id}/edit`}>
              <button className="ui-btn ui-btn--md" data-variant="outline">Edit</button>
            </Link>

            {/* Draft → Pay; Active → Renew */}
            {!bike.is_active ? (
              <Link to={`/pay/${bike.id}`}>
                <button className="ui-btn ui-btn--md" data-variant="brand">Pay $10 to Post</button>
              </Link>
            ) : (
              <Link to={`/pay/${bike.id}`}>
                <button className="ui-btn ui-btn--md" data-variant="soft">Renew $3</button>
              </Link>
            )}

            {/* Destructive action (with spinner while saving) */}
            <button
              className="ui-btn ui-btn--md"
              data-variant="danger"
              onClick={onDelete}
              disabled={saving}
              title="Delete listing"
            >
              {saving ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* --- Carousel (letterboxed, no crop) --- */}
      {/* WHY: Using .img-frame/.img-fit classes keeps a consistent frame without cropping images oddly. */}
      {/* used chatGPT for photo formatting because the photos were getting cut off */}
      {photos.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div className="img-frame img-frame--detail" style={{ position: "relative" }}>
            <img
              key={idx}
              src={fullUrl(photos[idx])}
              alt={`${bike.title} photo ${idx + 1} of ${photos.length}`}
              className="img-fit" // NOTE: see index.css for object-fit + max sizing
            />
            {/* Prev/Next buttons with accessible labels */}
            <button type="button" aria-label="Previous image" onClick={goPrev} style={navBtnStyle("left")}>‹</button>
            <button type="button" aria-label="Next image" onClick={goNext} style={navBtnStyle("right")}>›</button>

            {/* Dots indicator */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Go to image ${i + 1}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    background: i === idx ? "black" : "rgba(0,0,0,0.3)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Price & quick facts --- */}
      {/* WHY: Show only the facts that exist to keep the UI clean. */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {typeof bike.price_usd === "number" && (
          <span className="bike-card__price">${bike.price_usd.toLocaleString()}</span>
        )}
        {bike.brand && <span><strong>Brand:</strong> {bike.brand}</span>}
        {bike.model && <span><strong>Model:</strong> {bike.model}</span>}
        {bike.year && <span><strong>Year:</strong> {bike.year}</span>}
        {bike.size && <span><strong>Size (label):</strong> {bike.size}</span>}
        {bike.frame_size_in && <span><strong>Frame Size:</strong> {bike.frame_size_in}"</span>}
        {bike.state && <span><strong>State:</strong> {bike.state}</span>}
        {bike.zip && <span><strong>ZIP:</strong> {bike.zip}</span>}
        {bike.condition && <span><strong>Condition:</strong> {bike.condition}</span>}
        {heightRange && <span><strong>Rider Height:</strong> {heightRange}</span>}
        {bike.owner_email && <span><strong>Listed by:</strong> {bike.owner_email}</span>}
      </div>

      {/* Long description */}
      {bike.description && <p style={{ marginTop: 4 }}>{bike.description}</p>}

      {/* --- Specs grid --- */}
      <h3>Detailed Specifications</h3>
      <div className="grid-2">
        {bike.bike_type && <Spec label="Bike Type" value={bike.bike_type} />}
        {bike.frame_material && <Spec label="Frame Material" value={bike.frame_material} />}
        {bike.wheel_size && <Spec label="Wheel Size" value={bike.wheel_size} />}
        {bike.drivetrain_rear && <Spec label="Rear Derailleur" value={bike.drivetrain_rear} />}
        {bike.brakes_model && <Spec label="Brakes (Brand/Model)" value={bike.brakes_model} />}
        {bike.saddle && <Spec label="Saddle" value={bike.saddle} />}
        {bike.weight_lb != null && <Spec label="Weight" value={`${bike.weight_lb} lb`} />}
      </div>
    </div>
  );
}

// Small presentational piece for the specs grid
function Spec({ label, value }) {
  return (
    <div className="card" style={{ padding: "10px 12px" }}>
      <div style={{ fontSize: 12, color: "var(--ui-muted)" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// Styles for the round, overlayed carousel nav buttons
function navBtnStyle(side) {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 8,
    width: 36,
    height: 36,
    borderRadius: "999px",
    background: "rgba(0,0,0,0.5)",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: "36px",
    textAlign: "center",
    userSelect: "none",
  };
}

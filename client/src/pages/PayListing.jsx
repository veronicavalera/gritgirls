import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function PayListing() {
  const { id } = useParams();
  const { token, userEmail } = useAuth();

  const [bike, setBike] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/bikes/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setBike(data);
      } catch (e) { setErr(e.message); }
    })();
  }, [id]);

  async function startListingCheckout() {
    setErr("");
    if (!token) return setErr("Please log in.");
    try {
      setBusy(true);
      const res = await fetch(`${API}/api/payments/checkout/listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bike_id: Number(id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.checkout_url; // Stripe Checkout
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function startRenewCheckout() {
    setErr("");
    if (!token) return setErr("Please log in.");
    try {
      setBusy(true);
      const res = await fetch(`${API}/api/payments/checkout/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bike_id: Number(id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to start renewal checkout");
      window.location.href = data.checkout_url;
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (err) return <div className="card">Error: {err}</div>;
  if (!bike) return <div className="card">Loading…</div>;

  const isOwner = bike.owner_email && userEmail && bike.owner_email === userEmail;
  const isDraft = !bike.is_active;
  const expiresAt = bike.expires_at ? new Date(bike.expires_at) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <Link to={`/bikes/${bike.id}`} style={{ fontSize: 14 }}>&larr; Back to Listing</Link>
      <h2 style={{ margin: 0 }}>Payment for: {bike.title}</h2>

      {!isOwner && (
        <div className="error">
          Only the owner can pay for or renew this listing.
        </div>
      )}

      {isOwner && (
        <>
          <div className="card" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <ul className="bare" style={{ lineHeight: 1.5 }}>
              <li><strong>Status:</strong> {isDraft ? "Draft (not live)" : (isExpired ? "Expired" : "Active")}</li>
              {!isDraft && expiresAt && (
                <li><strong>Expires:</strong> {expiresAt.toLocaleDateString()}</li>
              )}
              <li><strong>Posting fee:</strong> $10 one-time to publish a draft</li>
              <li><strong>Renewal:</strong> $3 to extend visibility by 20 days</li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {isDraft && (
              <button onClick={startListingCheckout} disabled={busy}>
                {busy ? "Redirecting…" : "Pay $10 to Post"}
              </button>
            )}
            {!isDraft && (
              <button onClick={startRenewCheckout} disabled={busy}>
                {busy ? "Redirecting…" : "Renew for $3 (20 days)"}
              </button>
            )}
            <Link to={`/bikes/${bike.id}`}>
              <button style={{ background: "#e5e7eb", color: "#111" }}>View Listing</button>
            </Link>
            <Link to={`/bikes/${bike.id}`}>
              <button style={{ background: "#eef2ff", color: "#4338ca" }}>Edit Listing</button>
            </Link>
          </div>

          <div className="hr" />

          {/* Compact summary */}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              {Array.isArray(bike.photos) && bike.photos[0] && (
                <img
                  src={/^https?:\/\//i.test(bike.photos[0]) ? bike.photos[0] : `${API}${bike.photos[0]}`}
                  alt={bike.title}
                  style={{ width: 160, height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid var(--ui-border)" }}
                />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{bike.title}</div>
                {typeof bike.price_usd === "number" && (
                  <div className="bike-card__price" style={{ marginTop: 2 }}>${bike.price_usd.toLocaleString()}</div>
                )}
                <div style={{ color: "var(--ui-muted)", fontSize: 13, marginTop: 2 }}>
                  {bike.brand || ""} {bike.model || ""} {bike.year ? `• ${bike.year}` : ""}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

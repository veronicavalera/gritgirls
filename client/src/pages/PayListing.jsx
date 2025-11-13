// client/pages/PayListing.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function PayListing() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.checkout_url;
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
      const data = await res.json();
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

  const isExpired = bike.expires_at && new Date(bike.expires_at) < new Date();
  const isOwner = bike.owner_email && userEmail && bike.owner_email === userEmail;

  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <Link to="/bikes" style={{ fontSize: 14 }}>&larr; Back to Bikes</Link>
      <h2 style={{ margin: 0 }}>Payment for: {bike.title}</h2>
      {!isOwner && (
        <div className="error">Only the owner can pay for or renew this listing.</div>
      )}
      {isOwner && (
        <>
          <p>
            {bike.is_active
              ? (isExpired
                 ? "This listing is expired. Renew to extend visibility by 20 days."
                 : "Your listing is active. You can renew to extend visibility by 20 days.")
              : "Your listing is a draft. Pay the listing fee to publish it."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!bike.is_active && (
              <button onClick={startListingCheckout} disabled={busy}>
                {busy ? "Redirecting…" : "Pay $10 to Post"}
              </button>
            )}
            {bike.is_active && (
              <button onClick={startRenewCheckout} disabled={busy}>
                {busy ? "Redirecting…" : "Renew for $3 (20 days)"}
              </button>
            )}
            <Link to={`/bikes/${bike.id}`}><button style={{ background: "#e5e7eb", color: "#111" }}>View Listing</button></Link>
          </div>
        </>
      )}
    </div>
  );
}

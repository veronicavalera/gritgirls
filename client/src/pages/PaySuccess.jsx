// client/pages/PaySuccess.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function PaySuccess() {
  const [sp] = useSearchParams();
  const bikeId = sp.get("bike");
  const [bike, setBike] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!bikeId) return;
      try {
        const res = await fetch(`${API}/api/bikes/${bikeId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setBike(data);
      } catch (e) { setErr(e.message); }
    })();
  }, [bikeId]);

  return (
    <div className="card" style={{ display: "grid", gap: 12, textAlign: "center" }}>
      <h2>Payment successful 🎉</h2>
      <p>Your listing is now live (or renewed) on GritGirls.</p>
      {err && <div className="error">{err}</div>}
      {bike && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to={`/bikes/${bike.id}`}><button>View Listing</button></Link>
          <Link to="/bikes"><button style={{ background: "#e5e7eb", color: "#111" }}>Browse Bikes</button></Link>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function fullUrl(u) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API}${u}`;
}

export default function Bikes() {
  const { userEmail } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  async function loadBikes(stateArg = "") {
    try {
      setErr("");
      setLoading(true);
      const url = new URL(`${API}/api/bikes`);
      const s = (stateArg || stateFilter || "").trim().toUpperCase().slice(0, 2);
      if (s) url.searchParams.set("state", s);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bikes");
      setBikes(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBikes(); }, []);

  return (
    <div className="bikes-page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, flex: "1 1 auto" }}>Bike Listings</h2>
        <Link to="/bikes/new">
          <button>+ Create a listing</button>
        </Link>
      </div>

      {/* Filter bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); loadBikes(); }}
        className="card"
        style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
      >
        <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Filter by state</span>
          <input
            name="stateFilter"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            maxLength={2}
            placeholder="e.g., NJ"
            style={{ width: 90 }}
          />
        </label>
        <button type="submit">Apply</button>
        {stateFilter && (
          <button
            type="button"
            onClick={() => { setStateFilter(""); loadBikes(""); }}
            style={{ background: "#e5e7eb", color: "#111" }}
          >
            Clear
          </button>
        )}
      </form>

      {err && <div className="card error">{err}</div>}

      {/* List */}
      {loading ? (
        <div className="card">Loading bikes…</div>
      ) : bikes.length === 0 ? (
        <div className="card">No bikes found.</div>
      ) : (
        <div className="grid-cards">
          {bikes.map((b) => (
            <article key={b.id} className="card bike-card" style={{ display: "grid", gap: 10 }}>
              <header className="bike-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <h3 className="bike-card__title" style={{ margin: 0 }}>
                  <Link to={`/bikes/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {b.title}
                  </Link>
                </h3>
                {typeof b.price_usd === "number" && (
                  <div className="bike-card__price">${b.price_usd.toLocaleString()}</div>
                )}
              </header>

              {/* thumbnail */}
              {Array.isArray(b.photos) && b.photos[0] && (
                <div className="img-frame" style={{ margin: "8px 0" }}>
                  <img
                    src={fullUrl(b.photos[0])}
                    alt={b.title}
                    className="img-fit"
                    loading="lazy"
                    srcSet={`
                      ${fullUrl(b.photos[0])} 600w
                    `}
                    sizes="(max-width: 600px) 100vw, 33vw"
                  />
                </div>
              )}

              <ul className="bike-card__meta">
                {b.brand && <li><strong>Brand:</strong> {b.brand}</li>}
                {b.model && <li><strong>Model:</strong> {b.model}</li>}
                {b.year && <li><strong>Year:</strong> {b.year}</li>}
                {b.size && <li><strong>Size:</strong> {b.size}</li>}
                {b.state && <li><strong>State:</strong> {b.state}</li>}
                {b.zip && <li><strong>ZIP:</strong> {b.zip}</li>}
              </ul>

              {b.owner_email && (
                <footer style={{ marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
                  listed by <strong>{b.owner_email === userEmail ? "you" : b.owner_email}</strong>
                </footer>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

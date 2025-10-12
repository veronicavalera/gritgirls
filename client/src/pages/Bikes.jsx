import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000"; // use 127.0.0.1 to avoid localhost quirks

export default function Bikes() {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/bikes`);
        if (!res.ok) throw new Error(`Failed ${res.status}`);
        const data = await res.json();
        console.log("Bikes from API:", data); // debug
        setBikes(data);
      } catch (e) {
        console.error("Fetch error:", e);
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading bikes…</p>;
  if (error) return <p style={{color:"crimson"}}>{error}</p>;
  if (!bikes.length) return <p>No bikes yet.</p>;

  return (
    <div>
      <h2>Bikes</h2>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {bikes.map((b) => (
          <li key={b.id} className="card">
            <strong>{b.title}</strong><br />
            {b.brand} {b.model} • {b.year || "—"} • Size {b.size || "—"} • Wheel {b.wheel_size || "—"}<br />
            Condition {b.condition || "—"} • ${b.price_usd ?? 0} • ZIP {b.zip_prefix || "—"}
          </li>
        ))}
      </ul>
    </div>
  );
}

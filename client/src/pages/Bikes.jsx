// client/src/pages/Bikes.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Bikes() {
  const { token, userEmail } = useAuth();

  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // create form state
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    brand: "",
    model: "",
    year: "",
    size: "",
    wheel_size: "",
    condition: "",
    price_usd: "",
    zip_prefix: "",
  });

  async function loadBikes() {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch(`${API}/api/bikes`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bikes");
      setBikes(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBikes();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onCreate(e) {
    e.preventDefault();
    setErr("");

    // Simple client validation
    if (!form.title.trim()) return setErr("Title is required.");
    if (form.price_usd && isNaN(Number(form.price_usd))) {
      return setErr("Price must be a number.");
    }
    if (form.zip_prefix && form.zip_prefix.length > 3) {
      return setErr("ZIP prefix should be 3 digits (e.g., 085).");
    }
    if (!token) return setErr("Please log in to create a listing.");

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/bikes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          // normalize types the backend expects
          year: form.year ? Number(form.year) : undefined,
          price_usd: form.price_usd ? Number(form.price_usd) : undefined,
          zip_prefix: form.zip_prefix?.slice(0, 3),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create listing");

      // clear form and reload
      setForm({
        title: "",
        brand: "",
        model: "",
        year: "",
        size: "",
        wheel_size: "",
        condition: "",
        price_usd: "",
        zip_prefix: "",
      });
      await loadBikes();
      // optional: scroll to top of list
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bikes-page">
      <h2 style={{ marginTop: 0 }}>Bike Listings</h2>

      {/* Create form (only if logged in) */}
      {token ? (
        <form onSubmit={onCreate} className="card form-card">
          <h3 style={{ marginTop: 0 }}>Create a listing</h3>
          {err && <div className="error">{err}</div>}

          <div className="grid-2">
            <label>
              Title*
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="e.g., Juliana Roubion S (2021)"
                required
              />
            </label>
            <label>
              Price (USD)
              <input
                name="price_usd"
                value={form.price_usd}
                onChange={onChange}
                inputMode="numeric"
                placeholder="e.g., 1800"
              />
            </label>
            <label>
              Brand
              <input
                name="brand"
                value={form.brand}
                onChange={onChange}
                placeholder="e.g., Juliana / Liv"
              />
            </label>
            <label>
              Model
              <input
                name="model"
                value={form.model}
                onChange={onChange}
                placeholder="e.g., Roubion / Pique"
              />
            </label>
            <label>
              Year
              <input
                name="year"
                value={form.year}
                onChange={onChange}
                inputMode="numeric"
                placeholder="e.g., 2021"
              />
            </label>
            <label>
              Size
              <input
                name="size"
                value={form.size}
                onChange={onChange}
                placeholder="e.g., S / M / L"
              />
            </label>
            <label>
              Wheel Size
              <input
                name="wheel_size"
                value={form.wheel_size}
                onChange={onChange}
                placeholder="e.g., 27.5 / 29"
              />
            </label>
            <label>
              Condition
              <input
                name="condition"
                value={form.condition}
                onChange={onChange}
                placeholder="e.g., Very Good"
              />
            </label>
            <label>
              ZIP prefix
              <input
                name="zip_prefix"
                value={form.zip_prefix}
                onChange={onChange}
                maxLength={3}
                placeholder="3 digits"
              />
            </label>
          </div>

          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Create Listing"}
          </button>
          {userEmail && (
            <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
              Listing will be posted by <strong>{userEmail}</strong>
            </p>
          )}
        </form>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          Please <a href="/login">log in</a> or <a href="/signup">sign up</a> to create a listing.
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="card">Loading bikes…</div>
      ) : bikes.length === 0 ? (
        <div className="card">No bikes yet. Be the first to list one!</div>
      ) : (
        <div className="grid-cards">
          {bikes.map((b) => (
            <article key={b.id} className="card bike-card">
              <header className="bike-card__header">
                <h3 className="bike-card__title">{b.title}</h3>
                {typeof b.price_usd === "number" && (
                  <div className="bike-card__price">${b.price_usd.toLocaleString()}</div>
                )}
              </header>

              <ul className="bike-card__meta">
                {b.brand && <li><strong>Brand:</strong> {b.brand}</li>}
                {b.model && <li><strong>Model:</strong> {b.model}</li>}
                {b.year && <li><strong>Year:</strong> {b.year}</li>}
                {b.size && <li><strong>Size:</strong> {b.size}</li>}
                {b.wheel_size && <li><strong>Wheel:</strong> {b.wheel_size}</li>}
                {b.condition && <li><strong>Condition:</strong> {b.condition}</li>}
                {b.zip_prefix && <li><strong>ZIP:</strong> {b.zip_prefix}</li>}
              </ul>

              {/* If you added owner_id and return owner info, you could show it here */}
              {/* <footer className="bike-card__footer">listed by {b.owner_email}</footer> */}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

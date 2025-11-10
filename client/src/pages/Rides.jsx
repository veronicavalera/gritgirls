import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Rides() {
  const { token, userId } = useAuth(); // make sure AuthContext exposes userId (from /auth/me)

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [stateFilter, setStateFilter] = useState("");

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    difficulty: "",
    terrain: "",
    state: "",
    zip_prefix: "",
    description: "",
  });

  async function loadRides(stateArg = "") {
    try {
      setErr(""); setLoading(true);
      const url = new URL(`${API}/api/rides`);
      const s = (stateArg || stateFilter || "").trim().toUpperCase().slice(0, 2);
      if (s) url.searchParams.set("state", s);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load rides");
      setRides(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRides(); }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    if (!form.title.trim() || !form.date) return setErr("Title and date are required.");
    if (!token) return setErr("Please log in to create a ride.");

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/rides`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          state: form.state?.toUpperCase().slice(0, 2) || undefined,
          zip_prefix: form.zip_prefix?.slice(0, 3) || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create ride");

      setForm({ title: "", date: "", time: "", difficulty: "", terrain: "", state: "", zip_prefix: "", description: "" });
      await loadRides();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRSVP(rideId) {
    if (!token) return setErr("Please log in to RSVP.");
    try {
      setErr("");
      const res = await fetch(`${API}/api/rides/${rideId}/rsvp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update RSVP");
      // refresh list to update counts
      await loadRides();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function fetchRideDetail(rideId) {
    // owner-only attendees will be included by backend
    try {
      const res = await fetch(`${API}/api/rides/${rideId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load ride");
      return data; // { attendees?: [...], ... }
    } catch (e) {
      setErr(e.message);
      return null;
    }
  }

  return (
    <div className="rides-page">
      <h2 style={{ marginTop: 0 }}>Rides</h2>

      {/* Filter bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); loadRides(); }}
        className="card"
        style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}
      >
        <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Filter by state</span>
          <input
            name="stateFilter"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            maxLength={2}
            placeholder="e.g., CO"
            style={{ width: 80 }}
          />
        </label>
        <button type="submit">Apply</button>
        {stateFilter && (
          <button
            type="button"
            onClick={() => { setStateFilter(""); loadRides(""); }}
            style={{ background: "#e5e7eb", color: "black" }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Create form */}
      {token ? (
        <form onSubmit={onCreate} className="card form-card">
          <h3 style={{ marginTop: 0 }}>Create a ride</h3>
          {err && <div className="error">{err}</div>}

          <div className="grid-2">
            <label>Title*<input name="title" value={form.title} onChange={onChange} required placeholder="e.g., Saturday Tempo Ride" /></label>
            <label>Date*<input type="date" name="date" value={form.date} onChange={onChange} required /></label>

            <label>Time<input type="time" name="time" value={form.time} onChange={onChange} /></label>
            <label>Difficulty<input name="difficulty" value={form.difficulty} onChange={onChange} placeholder="e.g., Intermediate" /></label>

            <label>Terrain<input name="terrain" value={form.terrain} onChange={onChange} placeholder="e.g., Singletrack" /></label>
            <label>State (2 letters)<input name="state" value={form.state} onChange={onChange} maxLength={2} placeholder="e.g., CO" /></label>

            <label>ZIP prefix (3 digits)<input name="zip_prefix" value={form.zip_prefix} onChange={onChange} maxLength={3} placeholder="e.g., 803" /></label>

            <label style={{ gridColumn: "1 / -1" }}>Description
              <textarea name="description" value={form.description} onChange={onChange} rows={3} placeholder="Pace, distance, meetup details…" />
            </label>
          </div>

          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Ride"}</button>
        </form>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          Please <a href="/login">log in</a> or <a href="/signup">sign up</a> to create and RSVP.
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
        </div>
      )}

      {/* List */}
      {err && <div className="card error">{err}</div>}
      {loading ? (
        <div className="card">Loading rides…</div>
      ) : rides.length === 0 ? (
        <div className="card">No rides found.</div>
      ) : (
        <div className="grid-cards">
          {rides.map((r) => (
            <article key={r.id} className="card">
              <h3 style={{ marginTop: 0 }}>{r.title}</h3>
              <ul className="bike-card__meta">
                {r.date && <li><strong>Date:</strong> {r.date}</li>}
                {r.time && <li><strong>Time:</strong> {r.time}</li>}
                {r.difficulty && <li><strong>Difficulty:</strong> {r.difficulty}</li>}
                {r.terrain && <li><strong>Terrain:</strong> {r.terrain}</li>}
                {r.state && <li><strong>State:</strong> {r.state}</li>}
                {r.zip_prefix && <li><strong>ZIP:</strong> {r.zip_prefix}</li>}
                <li><strong>Attending:</strong> {r.attendee_count ?? 0}</li>
              </ul>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => toggleRSVP(r.id)}>
                  RSVP / Un-RSVP
                </button>

                {userId && r.owner_id === userId && (
                  <OwnerAttendeesBadge rideId={r.id} token={token} />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small inline component to show attendees if you are the owner */
function OwnerAttendeesBadge({ rideId, token }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/rides/${rideId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.attendees)) {
        setList(data.attendees);
      } else {
        setList([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open]);

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide attendees" : "View attendees"}
      </button>
      {open && (
        <div className="card" style={{ marginTop: 8 }}>
          {loading ? "Loading…" : (
            list.length === 0 ? "No RSVPs yet." : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {list.map(a => (
                  <li key={a.id}>{a.email}</li>
                ))}
              </ul>
            )
          )}
        </div>
      )}
    </div>
  );
}

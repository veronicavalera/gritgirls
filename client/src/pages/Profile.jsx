import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Profile() {
  const { token, userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    age: "",
    state: "",
    zip_prefix: "",
    experience_level: "",
    bike: "",
    phone: "",
    contact_email: "",
  });

  useEffect(() => {
    async function load() {
      if (!token) { setLoading(false); return; }
      setErr(""); setOk("");
      try {
        const res = await fetch(`${API}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        setForm({
          age: data.age ?? "",
          state: data.state ?? "",
          zip_prefix: data.zip_prefix ?? "",
          experience_level: data.experience_level ?? "",
          bike: data.bike ?? "",
          phone: data.phone ?? "",
          contact_email: data.contact_email ?? userEmail ?? "",
        });
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, userEmail]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    if (!token) { setErr("Please log in."); return; }
    setSaving(true); setErr(""); setOk("");
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      setOk("Profile saved.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setOk(""), 2000);
    }
  }

  if (!token) {
    return (
      <div className="card">
        <h2>Profile</h2>
        <p>Please <a href="/login">log in</a> or <a href="/signup">create an account</a> to edit your profile.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>My Profile</h2>
      <form onSubmit={onSave} className="card" style={{ display: "grid", gap: 12 }}>
        {loading ? <div>Loading…</div> : (
          <>
            {err && <div className="error">{err}</div>}
            {ok && <div style={{ background:"#ecfdf5", color:"#065f46", border:"1px solid #a7f3d0", padding:"8px 10px", borderRadius:10 }}>{ok}</div>}

            <div className="grid-2">
              <label>
                Age
                <input name="age" inputMode="numeric" value={form.age} onChange={onChange} placeholder="e.g., 22" />
              </label>
              <label>
                State
                <input name="state" value={form.state} onChange={onChange} maxLength={2} placeholder="e.g., NJ" />
              </label>
              <label>
                ZIP prefix
                <input name="zip_prefix" value={form.zip_prefix} onChange={onChange} maxLength={5} placeholder="3–5 digits" />
              </label>
              <label>
                Experience level
                <input name="experience_level" value={form.experience_level} onChange={onChange} placeholder="Beginner / Intermediate / Advanced" />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                What bike do you ride?
                <input name="bike" value={form.bike} onChange={onChange} placeholder="e.g., Juliana Roubion, Liv Pique" />
              </label>
              <label>
                Phone
                <input name="phone" value={form.phone} onChange={onChange} placeholder="optional" />
              </label>
              <label>
                Contact email
                <input name="contact_email" value={form.contact_email} onChange={onChange} placeholder="optional" />
              </label>
            </div>

            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              Your state/ZIP help others find nearby riders. Email/phone are optional and will appear only where you choose later.
            </p>
          </>
        )}
      </form>
    </div>
  );
}


// client/src/pages/Login.jsx
// Purpose: Simple email/password login form.
// - Posts credentials to /api/auth/login
// - On success, stores the JWT + email in AuthContext and redirects home.

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// Read API base from Vite env; fall back to localhost for dev
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Login() {
  // AuthContext gives us setAuth to persist token/email in app state + localStorage
  const { setAuth } = useAuth();
  const nav = useNavigate();

  // Local UI state for form inputs and UX flags
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");     // human-readable error message
  const [saving, setSaving] = useState(false); // disables button during request

  // Handle form submit
  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      setSaving(true);

      // POST credentials to backend login endpoint
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Parse JSON safely (avoid throw if no json)
      const data = await res.json().catch(() => ({}));

      // Normalize error handling (surface server-provided message if present)
      if (!res.ok) throw new Error(data.error || "Login failed");

      // On success, stash token + email in AuthContext.
      // This also saves to localStorage (inside AuthContext) so refresh persists.
      setAuth({ token: data.access_token, userEmail: data.user.email });

      // Navigate home; Navbar reacts immediately because context changed.
      nav("/");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Login</h2>

      {/* Card container for the form */}
      <form
        onSubmit={onSubmit}
        className="card"
        style={{ display: "grid", gap: 8, maxWidth: 360 }}
      >
        {/* Inline error banner */}
        {err && <div style={{ color: "crimson" }}>{err}</div>}

        {/* Controlled inputs keep React state as source of truth */}
        <input
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          inputMode="email"
          autoComplete="email"
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {/* Used ChatGPT for this: Submit is disabled while request is in-flight to prevent double-posts */}
        <button type="submit" disabled={saving}>
          {saving ? "Logging in…" : "Log in"}
        </button>
      </form>

      {/* Helpful link to signup */}
      <p style={{ marginTop: 8 }}>
        Don’t have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}

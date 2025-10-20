import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


export default function Signup() {
  const { setAuth } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      setSaving(true);
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Signup failed");
      // store token + email
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userEmail", data.user.email);
      setAuth({ token: data.access_token, userEmail: data.user.email });
      nav("/"); // go home
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Create your account</h2>
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <input
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
        <button type="submit" disabled={saving}>{saving ? "Signing up…" : "Sign up"}</button>
      </form>
      <p style={{ marginTop: 8 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

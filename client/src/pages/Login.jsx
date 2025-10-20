// client/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userEmail", data.user.email);
      nav("/"); // go home after login
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button type="submit">Log in</button>
      </form>
    </div>
  );
}

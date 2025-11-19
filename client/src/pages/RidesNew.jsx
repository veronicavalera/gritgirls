// client/pages/RidesNew.jsx
// create. new ride listing 
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { Section, Card, CardHeader, CardContent, Field, Input, Textarea, Button } from "../ui/UiKit.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function RidesNew() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", date: "", time: "",
    difficulty: "", terrain: "",
    state: "", zip_prefix: "", description: "",
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    if (!token) return setErr("Please log in to create a ride.");
    if (!form.title.trim() || !form.date) return setErr("Title and date are required.");

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

      navigate("/rides");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Create a Ride" subtitle="Post a meet-up for women riders in your area." />
      <Card className="form-card">
        <CardHeader title="Ride details" />
        <CardContent>
          {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
          <form onSubmit={onCreate} className="grid-2">
            <Field label="Title*"><Input name="title" value={form.title} onChange={onChange} required placeholder="e.g., Saturday Tempo Ride" /></Field>
            <Field label="Date*"><Input type="date" name="date" value={form.date} onChange={onChange} required /></Field>

            <Field label="Time"><Input type="time" name="time" value={form.time} onChange={onChange} /></Field>
            <Field label="Difficulty"><Input name="difficulty" value={form.difficulty} onChange={onChange} placeholder="e.g., Intermediate" /></Field>

            <Field label="Terrain"><Input name="terrain" value={form.terrain} onChange={onChange} placeholder="e.g., Singletrack" /></Field>
            <Field label="State (2 letters)"><Input name="state" value={form.state} onChange={onChange} maxLength={2} placeholder="e.g., CO" /></Field>

            <Field label="ZIP prefix (3 digits)"><Input name="zip_prefix" value={form.zip_prefix} onChange={onChange} maxLength={3} placeholder="e.g., 803" /></Field>

            <Field label="Description">
              <Textarea name="description" value={form.description} onChange={onChange} rows={3} placeholder="Pace, distance, meetup details…" />
            </Field>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Ride"}</Button>
              <Button variant="neutral" type="button" onClick={() => navigate("/rides")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

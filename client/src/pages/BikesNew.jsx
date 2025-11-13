// client/pages/BikeNew.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { Section, Card, CardHeader, CardContent, Field, Input, Select, Textarea, Button } from "../ui/UiKit.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const MAX_PHOTOS = 3;
const MAX_MB = 5;

function isTooBig(file) { return file.size > MAX_MB * 1024 * 1024; }

export default function BikeNew() {
  const { token, userEmail } = useAuth();
  const navigate = useNavigate();

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", price_usd: "", brand: "", model: "", year: "", size: "",
    state: "", zip: "", wheel_size: "", condition: "", description: "",
    frame_size_in: "", rider_height_min_in: "", rider_height_max_in: "",
    bike_type: "", frame_material: "", drivetrain_rear: "", brakes_model: "",
    saddle: "", weight_lb: "",
  });

  const [photoFiles, setPhotoFiles] = useState([]); // File[]
  const [photoURLs, setPhotoURLs] = useState([]);   // string[] (already uploaded)

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onPickPhotos(e) {
    setErr("");
    const files = Array.from(e.target.files || []);
    const tooBig = files.filter(isTooBig);
    const ok = files.filter(f => !isTooBig(f));

    if (tooBig.length) {
      setErr(`Skipped oversized images (> ${MAX_MB}MB): ${tooBig.map(f => f.name).join(", ")}`);
    }
    const room = Math.max(0, MAX_PHOTOS - photoURLs.length);
    setPhotoFiles((pf) => [...pf, ...ok].slice(0, room));
  }

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/api/uploads/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url; // relative path "/api/uploads/uuid.ext"
  }

  async function removePhoto(index) {
    setErr("");
    if (index < photoURLs.length) {
      const absolute = `${API}${photoURLs[index]}`;
      const filename = new URL(absolute).pathname.split("/").pop();
      try {
        await fetch(`${API}/api/uploads/${filename}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
      const next = [...photoURLs]; next.splice(index, 1); setPhotoURLs(next);
    } else {
      const localIndex = index - photoURLs.length;
      const nextF = [...photoFiles]; nextF.splice(localIndex, 1); setPhotoFiles(nextF);
    }
  }

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    if (!token) return setErr("Please log in to create a listing.");

    // quick client checks
    if (!form.title.trim()) return setErr("Title is required.");
    if (form.price_usd && isNaN(Number(form.price_usd))) return setErr("Price must be a number.");
    if (form.year && isNaN(Number(form.year))) return setErr("Year must be a number.");
    if (form.zip && !/^\d{5}$/.test(form.zip)) return setErr("ZIP must be 5 digits.");
    if (form.frame_size_in && isNaN(Number(form.frame_size_in))) return setErr("Frame size must be a number.");
    if (form.rider_height_min_in && isNaN(Number(form.rider_height_min_in))) return setErr("Rider min height must be a number.");
    if (form.rider_height_max_in && isNaN(Number(form.rider_height_max_in))) return setErr("Rider max height must be a number.");
    if (form.weight_lb && isNaN(Number(form.weight_lb))) return setErr("Weight must be a number.");

    try {
      setSaving(true);

      // upload photos (new ones)
      let urls = [...photoURLs];
      for (let i = 0; i < photoFiles.length && urls.length < MAX_PHOTOS; i++) {
        const f = photoFiles[i];
        if (!f.type.startsWith("image/")) throw new Error("Only image files are allowed.");
        if (isTooBig(f)) throw new Error(`Each image must be ≤ ${MAX_MB}MB.`);
        const url = await uploadOne(f);
        urls.push(url);
      }
      urls = urls.slice(0, MAX_PHOTOS);
      setPhotoURLs(urls);

      const payload = {
        title: form.title?.trim(),
        price_usd: form.price_usd ? Number(form.price_usd) : undefined,
        brand: form.brand?.trim() || undefined,
        model: form.model?.trim() || undefined,
        year: form.year ? Number(form.year) : undefined,
        size: form.size?.trim() || undefined,
        state: form.state?.toUpperCase().slice(0, 2) || undefined,
        zip: form.zip || undefined,
        wheel_size: form.wheel_size?.trim() || undefined,
        condition: form.condition?.trim() || undefined,
        description: form.description?.trim() || undefined,
        frame_size_in: form.frame_size_in ? Number(form.frame_size_in) : undefined,
        rider_height_min_in: form.rider_height_min_in ? Number(form.rider_height_min_in) : undefined,
        rider_height_max_in: form.rider_height_max_in ? Number(form.rider_height_max_in) : undefined,
        bike_type: form.bike_type?.trim() || undefined,
        frame_material: form.frame_material?.trim() || undefined,
        drivetrain_rear: form.drivetrain_rear?.trim() || undefined,
        brakes_model: form.brakes_model?.trim() || undefined,
        saddle: form.saddle?.trim() || undefined,
        weight_lb: form.weight_lb ? Number(form.weight_lb) : undefined,
        photos: urls,
      };

      const res = await fetch(`${API}/api/bikes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create listing");

      // go pay
      navigate(`/pay/${data.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Section
        title="Create a Bike Listing"
        subtitle="Add details, upload up to 3 photos, and publish after payment."
      />
      <Card className="form-card">
        <CardHeader title="Listing details" aside={userEmail ? <span className="chip">Posting as <strong>{userEmail}</strong></span> : null} />
        <CardContent>
          {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
          <form onSubmit={onCreate} className="grid-2">
            <Field label="Title*"><Input name="title" value={form.title} onChange={onChange} required placeholder="e.g., Juliana Roubion S (2021)" /></Field>
            <Field label="Price (USD)"><Input name="price_usd" value={form.price_usd} onChange={onChange} inputMode="numeric" placeholder="e.g., 1800" /></Field>

            <Field label="Brand"><Input name="brand" value={form.brand} onChange={onChange} placeholder="e.g., Juliana / Liv" /></Field>
            <Field label="Model"><Input name="model" value={form.model} onChange={onChange} placeholder="e.g., Roubion / Pique" /></Field>

            <Field label="Year"><Input name="year" value={form.year} onChange={onChange} inputMode="numeric" placeholder="e.g., 2021" /></Field>
            <Field label="Size (label)"><Input name="size" value={form.size} onChange={onChange} placeholder="e.g., S / M / L" /></Field>

            <Field label="State (2 letters)"><Input name="state" value={form.state} onChange={onChange} maxLength={2} placeholder="e.g., NJ" /></Field>
            <Field label="ZIP (5 digits)"><Input name="zip" value={form.zip} onChange={onChange} maxLength={5} placeholder="e.g., 08544" /></Field>

            <Field label="Wheel size"><Input name="wheel_size" value={form.wheel_size} onChange={onChange} placeholder="e.g., 27.5 / 29" /></Field>
            <Field label="Condition"><Input name="condition" value={form.condition} onChange={onChange} placeholder="e.g., Excellent" /></Field>

            <Field label="Frame size (in)"><Input name="frame_size_in" value={form.frame_size_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 16" /></Field>
            <Field label="Rider height min (in)"><Input name="rider_height_min_in" value={form.rider_height_min_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 63" /></Field>

            <Field label="Rider height max (in)"><Input name="rider_height_max_in" value={form.rider_height_max_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 66" /></Field>
            <Field label="Bike type">
              <Select name="bike_type" value={form.bike_type} onChange={onChange}>
                <option value="">—</option>
                <option value="MTB">MTB</option>
                <option value="ROAD">Road</option>
                <option value="GRAVEL">Gravel</option>
                <option value="HYBRID">Hybrid</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>

            <Field label="Frame material"><Input name="frame_material" value={form.frame_material} onChange={onChange} placeholder="e.g., Carbon" /></Field>
            <Field label="Rear derailleur"><Input name="drivetrain_rear" value={form.drivetrain_rear} onChange={onChange} placeholder="e.g., Shimano 105" /></Field>

            <Field label="Brakes (model)"><Input name="brakes_model" value={form.brakes_model} onChange={onChange} placeholder="e.g., SRAM Level" /></Field>
            <Field label="Saddle"><Input name="saddle" value={form.saddle} onChange={onChange} placeholder="e.g., Selle Italia Donna" /></Field>

            <Field label="Weight (lb)"><Input name="weight_lb" value={form.weight_lb} onChange={onChange} inputMode="numeric" placeholder="e.g., 24.5" /></Field>

            <Field label={`Photos (up to ${MAX_PHOTOS})`} hint={`JPEG/PNG, ≤ ${MAX_MB}MB each`}>
              <Input type="file" accept="image/*" multiple onChange={onPickPhotos} />
              {(photoURLs.length + photoFiles.length) > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {photoURLs.map((u, i) => (
                    <div key={`u-${i}`} className="card" style={{ padding: 6, width: 170 }}>
                      <img src={`${API}${u}`} alt={`photo ${i + 1}`} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--ui-muted)" }}>uploaded</span>
                        <Button type="button" variant="neutral" className="small" onClick={() => removePhoto(i)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                  {photoFiles.map((f, idx) => (
                    <div key={`f-${idx}`} className="card" style={{ padding: 6, width: 170 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ui-muted)" }}>
                        {(f.size / 1024).toFixed(0)} KB {isTooBig(f) && <span style={{ color: "crimson", marginLeft: 6 }}>(too big)</span>}
                      </div>
                      <Button
                        type="button"
                        variant="neutral"
                        className="small"
                        onClick={() => removePhoto(photoURLs.length + idx)}
                        style={{ marginTop: 6 }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Description" hint="Condition, service history, any notes." >
              <Textarea name="description" value={form.description} onChange={onChange} rows={4} />
            </Field>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Continue to Payment"}</Button>
              <Button type="button" variant="neutral" onClick={() => window.history.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

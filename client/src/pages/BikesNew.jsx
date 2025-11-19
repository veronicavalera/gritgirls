// client/pages/BikeNew.jsx
// Purpose: Create a new bike listing (draft) with optional photo uploads,
// then send the user to the Stripe payment page to publish.

// React state + navigation
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Auth context gives us the JWT (token) and the current user's email for UX
import { useAuth } from "../auth/AuthContext.jsx";

// Small UI primitives (pure presentational components)
import {
  Section, Card, CardHeader, CardContent,
  Field, Input, Select, Textarea, Button
} from "../ui/UiKit.jsx";

// API base URL (Vite env with a local fallback)
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Basic constraints for uploads (kept small to control storage cost + perf)
const MAX_PHOTOS = 3;
const MAX_MB = 5;

// Helper: reject too-large files early (avoids time + bandwidth waste)
// NOTE: the server enforces its own limits too—this is additional UX safety.
function isTooBig(file) {
  return file.size > MAX_MB * 1024 * 1024;
}

export default function BikeNew() {
  const { token, userEmail } = useAuth();
  const navigate = useNavigate();

  // UX state
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state: keep everything as strings in the UI, cast to numbers right before POST
  const [form, setForm] = useState({
    title: "", price_usd: "", brand: "", model: "", year: "", size: "",
    state: "", zip: "", wheel_size: "", condition: "", description: "",
    frame_size_in: "", rider_height_min_in: "", rider_height_max_in: "",
    bike_type: "", frame_material: "", drivetrain_rear: "", brakes_model: "",
    saddle: "", weight_lb: "",
  });

  // Photo handling:
  // - photoFiles: files chosen this session (not uploaded yet)
  // - photoURLs: URLs already uploaded (e.g., you picked some earlier and kept them)
  const [photoFiles, setPhotoFiles] = useState([]); // File[]
  const [photoURLs, setPhotoURLs] = useState([]);   // string[]

  // Generic form field change handler
  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  // Handle <input type="file" multiple> selection
  function onPickPhotos(e) {
    setErr("");
    const files = Array.from(e.target.files || []);

    // Split by size to give immediate feedback
    const tooBig = files.filter(isTooBig);
    const ok = files.filter(f => !isTooBig(f));

    if (tooBig.length) {
      setErr(`Skipped oversized images (> ${MAX_MB}MB): ${tooBig.map(f => f.name).join(", ")}`);
    }

    // Enforce MAX_PHOTOS total (already-uploaded + new) to keep UI predictable
    const room = Math.max(0, MAX_PHOTOS - photoURLs.length);
    setPhotoFiles((pf) => [...pf, ...ok].slice(0, room));
  }

  // Upload a single image to the server; returns a relative URL like "/api/uploads/uuid.ext"
  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API}/api/uploads/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // server requires auth to upload
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url; // relative path the API will also return with the bike record
  }

  // Remove a photo by index (handles both already-uploaded and not-yet-uploaded)
  async function removePhoto(index) {
    setErr("");

    // Case 1: it’s already uploaded → delete the file on the server too
    if (index < photoURLs.length) {
      const absolute = `${API}${photoURLs[index]}`;
      const filename = new URL(absolute).pathname.split("/").pop();

      try {
        await fetch(`${API}/api/uploads/${filename}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Swallow errors: removing a preview should never block the user
      }

      const next = [...photoURLs];
      next.splice(index, 1);
      setPhotoURLs(next);
      return;
    }

    // Case 2: it’s a local file waiting to be uploaded
    const localIndex = index - photoURLs.length;
    const nextF = [...photoFiles];
    nextF.splice(localIndex, 1);
    setPhotoFiles(nextF);
  }

  // Create listing (POST /api/bikes), then redirect to /pay/:id to publish it
  async function onCreate(e) {
    e.preventDefault();
    setErr("");

    // Must be logged in to create a listing
    if (!token) return setErr("Please log in to create a listing.");

    // Light client-side validation for good UX (the server also validates)
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

      // 1) Upload any new photos first to get stable URLs for the payload
      let urls = [...photoURLs];
      for (let i = 0; i < photoFiles.length && urls.length < MAX_PHOTOS; i++) {
        const f = photoFiles[i];
        if (!f.type.startsWith("image/")) throw new Error("Only image files are allowed.");
        if (isTooBig(f)) throw new Error(`Each image must be ≤ ${MAX_MB}MB.`);
        const url = await uploadOne(f);
        urls.push(url);
      }
      urls = urls.slice(0, MAX_PHOTOS);
      setPhotoURLs(urls); // reflect uploaded state in UI

      // 2) Build the POST payload (trim strings, cast numerics, skip empty fields)
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

      // 3) Create a draft listing on the server
      const res = await fetch(`${API}/api/bikes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create listing");

      // 4) Immediately send the user to the payment flow to publish (remain a draft until paid)
      navigate(`/pay/${data.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Top section header */}
      <Section
        title="Create a Bike Listing"
        subtitle="Add details, upload up to 3 photos, and publish after payment."
      />

      {/* Main form card */}
      <Card className="form-card">
        <CardHeader
          title="Listing details"
          aside={userEmail ? <span className="chip">Posting as <strong>{userEmail}</strong></span> : null}
        />
        <CardContent>
          {/* Error banner (non-blocking layout) */}
          {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

          {/* Form grid (2 columns on wide screens via CSS) */}
          <form onSubmit={onCreate} className="grid-2">
            {/* Required basics */}
            <Field label="Title*">
              <Input name="title" value={form.title} onChange={onChange} required placeholder="e.g., Juliana Roubion S (2021)" />
            </Field>
            <Field label="Price (USD)">
              <Input name="price_usd" value={form.price_usd} onChange={onChange} inputMode="numeric" placeholder="e.g., 1800" />
            </Field>

            {/* Identity */}
            <Field label="Brand"><Input name="brand" value={form.brand} onChange={onChange} placeholder="e.g., Juliana / Liv" /></Field>
            <Field label="Model"><Input name="model" value={form.model} onChange={onChange} placeholder="e.g., Roubion / Pique" /></Field>

            {/* Basic specs */}
            <Field label="Year"><Input name="year" value={form.year} onChange={onChange} inputMode="numeric" placeholder="e.g., 2021" /></Field>
            <Field label="Size (label)"><Input name="size" value={form.size} onChange={onChange} placeholder="e.g., S / M / L" /></Field>

            {/* Location */}
            <Field label="State (2 letters)"><Input name="state" value={form.state} onChange={onChange} maxLength={2} placeholder="e.g., NJ" /></Field>
            <Field label="ZIP (5 digits)"><Input name="zip" value={form.zip} onChange={onChange} maxLength={5} placeholder="e.g., 08544" /></Field>

            {/* More specs */}
            <Field label="Wheel size"><Input name="wheel_size" value={form.wheel_size} onChange={onChange} placeholder="e.g., 27.5 / 29" /></Field>
            <Field label="Condition"><Input name="condition" value={form.condition} onChange={onChange} placeholder="e.g., Excellent" /></Field>

            {/* Dimensional info */}
            <Field label="Frame size (in)"><Input name="frame_size_in" value={form.frame_size_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 16" /></Field>
            <Field label="Rider height min (in)"><Input name="rider_height_min_in" value={form.rider_height_min_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 63" /></Field>

            <Field label="Rider height max (in)"><Input name="rider_height_max_in" value={form.rider_height_max_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 66" /></Field>

            {/* Enum-ish fields */}
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

            {/* Photos picker + preview list */}
            <Field label={`Photos (up to ${MAX_PHOTOS})`} hint={`JPEG/PNG, ≤ ${MAX_MB}MB each`}>
              <Input type="file" accept="image/*" multiple onChange={onPickPhotos} />

              {/* Previews: uploaded (with thumbnails) and local selections (filename + size) */}
              {(photoURLs.length + photoFiles.length) > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {/* Uploaded thumbnails */}
                  {photoURLs.map((u, i) => (
                    <div key={`u-${i}`} className="card" style={{ padding: 6, width: 170 }}>
                      <img
                        src={`${API}${u}`}
                        alt={`photo ${i + 1}`}
                        style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8 }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--ui-muted)" }}>uploaded</span>
                        <Button type="button" variant="neutral" className="small" onClick={() => removePhoto(i)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* New (not yet uploaded) selections */}
                  {photoFiles.map((f, idx) => (
                    <div key={`f-${idx}`} className="card" style={{ padding: 6, width: 170 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}>
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

            {/* Freeform description */}
            <Field label="Description" hint="Condition, service history, any notes.">
              <Textarea name="description" value={form.description} onChange={onChange} rows={4} />
            </Field>

            {/* Actions */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
              {/* Primary: create then go to payment */}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Continue to Payment"}
              </Button>

              {/* Secondary: just go back (doesn't mutate anything) */}
              <Button type="button" variant="neutral" onClick={() => window.history.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

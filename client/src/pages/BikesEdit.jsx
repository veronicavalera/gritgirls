// allows a user to edit their listing before paying to post 
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// If you’re using the UiKit components:
import {
  Section, Card, CardHeader, CardContent,
  Field, Input, Select, Textarea, Button
} from "../ui/UiKit.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const MAX_PHOTOS = 3;
const MAX_MB = 5;

function fullUrl(u) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API}${u}`;
}

export default function BikesEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, userEmail } = useAuth();

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form fields (same as create)
  const [form, setForm] = useState({
    title: "",
    price_usd: "",
    brand: "",
    model: "",
    year: "",
    size: "",
    state: "",
    zip: "",
    wheel_size: "",
    condition: "",
    description: "",
    frame_size_in: "",
    rider_height_min_in: "",
    rider_height_max_in: "",
    bike_type: "",
    frame_material: "",
    drivetrain_rear: "",
    brakes_model: "",
    saddle: "",
    weight_lb: "",
  });

  // Photos (same behavior as create)
  const [photoURLs, setPhotoURLs] = useState([]);   // already uploaded (relative)
  const [photoFiles, setPhotoFiles] = useState([]); // new local File[]

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await fetch(`${API}/api/bikes/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");

        // owner gate (optional but nice to have)
        if (data.owner_email && userEmail && data.owner_email !== userEmail) {
          throw new Error("You can only edit your own listing.");
        }

        // Prefill form from server model
        setForm({
          title: data.title || "",
          price_usd: data.price_usd ?? "",
          brand: data.brand || "",
          model: data.model || "",
          year: data.year ?? "",
          size: data.size || "",
          state: data.state || "",
          zip: data.zip || "",
          wheel_size: data.wheel_size || "",
          condition: data.condition || "",
          description: data.description || "",
          frame_size_in: data.frame_size_in ?? "",
          rider_height_min_in: data.rider_height_min_in ?? "",
          rider_height_max_in: data.rider_height_max_in ?? "",
          bike_type: data.bike_type || "",
          frame_material: data.frame_material || "",
          drivetrain_rear: data.drivetrain_rear || "",
          brakes_model: data.brakes_model || "",
          saddle: data.saddle || "",
          weight_lb: data.weight_lb ?? "",
        });

        setPhotoURLs(Array.isArray(data.photos) ? data.photos : []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, userEmail]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function isTooBig(file) {
    return file.size > MAX_MB * 1024 * 1024;
  }

  function onPickPhotos(e) {
    setErr("");
    const files = Array.from(e.target.files || []);

    // size guard
    const tooBig = files.filter(isTooBig);
    const ok = files.filter((f) => !isTooBig(f));
    if (tooBig.length > 0) {
      const names = tooBig.map((f) => f.name).join(", ");
      setErr(`Skipped oversized images (> ${MAX_MB}MB): ${names}`);
    }

    // cap to remaining slots
    const room = Math.max(0, MAX_PHOTOS - photoURLs.length);
    const next = [...photoFiles, ...ok].slice(0, room);
    setPhotoFiles(next);
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
    return data.url; // relative URL
  }

  async function removePhoto(index) {
    setErr("");
    if (index < photoURLs.length) {
      // remove an already-uploaded server file
      const absolute = fullUrl(photoURLs[index]);
      const pathname = new URL(absolute).pathname;
      const filename = pathname.split("/").pop();
      try {
        await fetch(`${API}/api/uploads/${filename}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // non-fatal
      }
      const next = [...photoURLs];
      next.splice(index, 1);
      setPhotoURLs(next);
    } else {
      // remove local pending file
      const localIdx = index - photoURLs.length;
      const next = [...photoFiles];
      next.splice(localIdx, 1);
      setPhotoFiles(next);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setErr("");
    if (!token) return setErr("Please log in.");

    try {
      setSaving(true);

      // Upload new local files if any
      let urls = [...photoURLs];
      for (let i = 0; i < photoFiles.length && urls.length < MAX_PHOTOS; i++) {
        const f = photoFiles[i];
        if (!f.type.startsWith("image/")) throw new Error("Only image files are allowed.");
        if (isTooBig(f)) throw new Error(`Each image must be ≤ ${MAX_MB}MB.`);
        const u = await uploadOne(f);
        urls.push(u);
      }
      urls = urls.slice(0, MAX_PHOTOS);

      const payload = {
        title: form.title?.trim(),
        price_usd: form.price_usd === "" ? null : Number(form.price_usd),
        brand: form.brand?.trim() || undefined,
        model: form.model?.trim() || undefined,
        year: form.year === "" ? null : Number(form.year),
        size: form.size?.trim() || undefined,
        state: form.state?.toUpperCase().slice(0, 2) || undefined,
        zip: form.zip || undefined,
        wheel_size: form.wheel_size?.trim() || undefined,
        condition: form.condition?.trim() || undefined,
        description: form.description?.trim() || undefined,
        frame_size_in: form.frame_size_in === "" ? null : Number(form.frame_size_in),
        rider_height_min_in: form.rider_height_min_in === "" ? null : Number(form.rider_height_min_in),
        rider_height_max_in: form.rider_height_max_in === "" ? null : Number(form.rider_height_max_in),
        bike_type: form.bike_type || undefined,
        frame_material: form.frame_material?.trim() || undefined,
        drivetrain_rear: form.drivetrain_rear?.trim() || undefined,
        brakes_model: form.brakes_model?.trim() || undefined,
        saddle: form.saddle?.trim() || undefined,
        weight_lb: form.weight_lb === "" ? null : Number(form.weight_lb),
        photos: urls,
      };

      const res = await fetch(`${API}/api/bikes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");

      // go back to detail view
      navigate(`/bikes/${id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Loading…</div>;
  if (err) return <div className="card error">{err}</div>;

  return (
    <>
      <Section
        title="Edit Listing"
        subtitle="Update details, photos, and specs — same fields as when you created the listing."
      >
        <Card>
          <CardHeader title="Listing details" />
          <CardContent>
            <form onSubmit={onSave} className="grid-2" style={{ gap: 16 }}>
              <Field label="Title" required>
                <Input name="title" value={form.title} onChange={onChange} placeholder="e.g., Juliana Roubion S (2021)" required />
              </Field>
              <Field label="Price (USD)">
                <Input name="price_usd" value={form.price_usd} onChange={onChange} inputMode="numeric" placeholder="e.g., 1800" />
              </Field>

              <Field label="Brand">
                <Input name="brand" value={form.brand} onChange={onChange} />
              </Field>
              <Field label="Model">
                <Input name="model" value={form.model} onChange={onChange} />
              </Field>

              <Field label="Year">
                <Input name="year" value={form.year} onChange={onChange} inputMode="numeric" />
              </Field>
              <Field label="Size (label)">
                <Input name="size" value={form.size} onChange={onChange} placeholder="S / M / L" />
              </Field>

              <Field label="State (2 letters)">
                <Input name="state" value={form.state} onChange={onChange} maxLength={2} placeholder="e.g., NJ" />
              </Field>
              <Field label="ZIP (5 digits)">
                <Input name="zip" value={form.zip} onChange={onChange} maxLength={5} placeholder="08544" />
              </Field>

              <Field label="Wheel size">
                <Input name="wheel_size" value={form.wheel_size} onChange={onChange} placeholder="27.5 / 29" />
              </Field>
              <Field label="Condition">
                <Input name="condition" value={form.condition} onChange={onChange} placeholder="Excellent / Good / Fair" />
              </Field>

              <Field label="Frame size (in)">
                <Input name="frame_size_in" value={form.frame_size_in} onChange={onChange} inputMode="numeric" />
              </Field>
              <Field label="Rider height min (in)">
                <Input name="rider_height_min_in" value={form.rider_height_min_in} onChange={onChange} inputMode="numeric" />
              </Field>

              <Field label="Rider height max (in)">
                <Input name="rider_height_max_in" value={form.rider_height_max_in} onChange={onChange} inputMode="numeric" />
              </Field>
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

              <Field label="Frame material">
                <Input name="frame_material" value={form.frame_material} onChange={onChange} placeholder="Carbon / Alloy / Steel" />
              </Field>
              <Field label="Rear derailleur">
                <Input name="drivetrain_rear" value={form.drivetrain_rear} onChange={onChange} placeholder="e.g., Shimano 105" />
              </Field>

              <Field label="Brakes (model)">
                <Input name="brakes_model" value={form.brakes_model} onChange={onChange} placeholder="e.g., SRAM Level" />
              </Field>
              <Field label="Saddle">
                <Input name="saddle" value={form.saddle} onChange={onChange} />
              </Field>

              <Field label="Weight (lb)">
                <Input name="weight_lb" value={form.weight_lb} onChange={onChange} inputMode="numeric" />
              </Field>

              <Field label="Description" full>
                <Textarea name="description" value={form.description} onChange={onChange} rows={4} placeholder="Condition, service history, notes…" />
              </Field>

              <Field label={`Photos (up to ${MAX_PHOTOS})`} full>
                <Input type="file" accept="image/*" multiple onChange={onPickPhotos} />
                {(photoURLs.length + photoFiles.length) > 0 && (
                  <>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {/* uploaded previews */}
                      {photoURLs.map((u, i) => (
                        <div key={`u-${i}`} className="card" style={{ padding: 6, width: 160 }}>
                          <img src={fullUrl(u)} alt={`photo ${i + 1}`} className="img-cover" style={{ height: 100 }} />
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--ui-muted)" }}>uploaded</span>
                            <Button size="sm" variant="neutral" onClick={() => removePhoto(i)}>Remove</Button>
                          </div>
                        </div>
                      ))}
                      {/* local files */}
                      {photoFiles.map((f, idx) => (
                        <div key={`f-${idx}`} className="card" style={{ padding: 6, width: 160 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ui-muted)" }}>
                            {(f.size / 1024).toFixed(0)} KB {isTooBig(f) && <span style={{ color: "crimson", marginLeft: 6 }}>(too big)</span>}
                          </div>
                          <Button size="sm" variant="neutral" onClick={() => removePhoto(photoURLs.length + idx)} style={{ marginTop: 6 }}>
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="neutral" onClick={() => { setPhotoFiles([]); setPhotoURLs([]); }} style={{ marginTop: 6 }}>
                      Clear all photos
                    </Button>
                  </>
                )}
              </Field>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
                <Link to={`/bikes/${id}`}><Button variant="neutral" type="button">Cancel</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}

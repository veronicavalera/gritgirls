import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Ensure any relative file path like "/api/uploads/xxx.jpg" becomes absolute
function fullUrl(u) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API}${u}`;
}

export default function Bikes() {
  const { token, userEmail } = useAuth();

  // ----- constants -----
  const MAX_PHOTOS = 3;
  const MAX_MB = 5;

  // ----- state -----
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filter
  const [stateFilter, setStateFilter] = useState("");

  // create form
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    price_usd: "",
    brand: "",
    model: "",
    year: "",
    size: "",
    state: "",
    zip: "",
    // details
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

  // photos
  const [photoFiles, setPhotoFiles] = useState([]); // File[] not yet uploaded
  const [photoURLs, setPhotoURLs] = useState([]);   // string[] already uploaded URLs (relative)

  // ----- helpers -----
  function isTooBig(file) {
    return file.size > MAX_MB * 1024 * 1024;
  }

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/api/uploads/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // require auth to upload
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Upload failed");
    // Backend returns { url: "/api/uploads/<uuid>.<ext>" }
    return data.url;
  }

  function onPickPhotos(e) {
    setErr("");
    const files = Array.from(e.target.files || []);

    // Filter out oversized files and report which were skipped
    const tooBig = files.filter(isTooBig);
    const ok = files.filter((f) => !isTooBig(f));

    if (tooBig.length > 0) {
      const names = tooBig.map((f) => f.name).join(", ");
      setErr(`Skipped oversized images (> ${MAX_MB}MB): ${names}`);
    }

    // Cap combined count (uploaded + local) to MAX_PHOTOS
    const room = Math.max(0, MAX_PHOTOS - photoURLs.length);
    const next = [...photoFiles, ...ok].slice(0, room);
    setPhotoFiles(next);
  }

  async function removePhoto(index) {
    setErr("");

    if (index < photoURLs.length) {
      // Remove an already-uploaded photo: call DELETE to remove file server-side
      const absolute = fullUrl(photoURLs[index]);     // ensure absolute
      const pathname = new URL(absolute).pathname;    // e.g., /api/uploads/uuid.jpg
      const filename = pathname.split("/").pop();     // uuid.jpg
      try {
        await fetch(`${API}/api/uploads/${filename}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // non-fatal
      }
      const nextURLs = [...photoURLs];
      nextURLs.splice(index, 1);
      setPhotoURLs(nextURLs);
    } else {
      // Remove a local File (not yet uploaded)
      const localIndex = index - photoURLs.length;
      const nextFiles = [...photoFiles];
      nextFiles.splice(localIndex, 1);
      setPhotoFiles(nextFiles);
    }
  }

  async function loadBikes(stateArg = "") {
    try {
      setErr("");
      setLoading(true);
      const url = new URL(`${API}/api/bikes`);
      const s = (stateArg || stateFilter || "").trim().toUpperCase().slice(0, 2);
      if (s) url.searchParams.set("state", s);
      const res = await fetch(url.toString());
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

    // quick client checks
    if (!form.title.trim()) return setErr("Title is required.");
    if (form.price_usd && isNaN(Number(form.price_usd)))
      return setErr("Price must be a number.");
    if (form.year && isNaN(Number(form.year)))
      return setErr("Year must be a number.");
    if (form.zip && !/^\d{5}$/.test(form.zip))
      return setErr("ZIP must be 5 digits.");
    if (form.frame_size_in && isNaN(Number(form.frame_size_in)))
      return setErr("Frame size must be a number (inches).");
    if (form.rider_height_min_in && isNaN(Number(form.rider_height_min_in)))
      return setErr("Rider min height (in) must be a number.");
    if (form.rider_height_max_in && isNaN(Number(form.rider_height_max_in)))
      return setErr("Rider max height (in) must be a number.");
    if (form.weight_lb && isNaN(Number(form.weight_lb)))
      return setErr("Weight (lb) must be a number.");
    if (!token) return setErr("Please log in to create a listing.");

    try {
      setSaving(true);

      // Upload photos first (validate + upload). Guard size again just in case.
      let urls = [...photoURLs];
      for (let i = 0; i < photoFiles.length && urls.length < MAX_PHOTOS; i++) {
        const f = photoFiles[i];
        if (!f.type.startsWith("image/")) throw new Error("Only image files are allowed.");
        if (isTooBig(f)) throw new Error(`Each image must be ≤ ${MAX_MB}MB.`);
        const url = await uploadOne(f); // returns relative URL
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

        // attach relative photo URLs
        photos: urls,
      };

      const res = await fetch(`${API}/api/bikes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create listing");

      // reset and reload
      setForm({
        title: "", price_usd: "", brand: "", model: "", year: "", size: "",
        state: "", zip: "", wheel_size: "", condition: "", description: "",
        frame_size_in: "", rider_height_min_in: "", rider_height_max_in: "",
        bike_type: "", frame_material: "", drivetrain_rear: "",
        brakes_model: "", saddle: "", weight_lb: "",
      });
      setPhotoFiles([]);
      setPhotoURLs([]);
      await loadBikes();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const combinedPhotoCount = photoURLs.length + photoFiles.length;

  return (
    <div className="bikes-page">
      <h2 style={{ marginTop: 0 }}>Bike Listings</h2>

      {/* Filter bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); loadBikes(); }}
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
            placeholder="e.g., NJ"
            style={{ width: 80 }}
          />
        </label>
        <button type="submit">Apply</button>
        {stateFilter && (
          <button
            type="button"
            onClick={() => { setStateFilter(""); loadBikes(""); }}
            style={{ background: "#e5e7eb", color: "black" }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Create form (auth only) */}
      {token ? (
        <form onSubmit={onCreate} className="card form-card">
          <h3 style={{ marginTop: 0 }}>Create a listing</h3>
          {err && <div className="error">{err}</div>}

          <div className="grid-2">
            <label>Title*<input name="title" value={form.title} onChange={onChange} required placeholder="e.g., Juliana Roubion S (2021)" /></label>
            <label>Price (USD)<input name="price_usd" value={form.price_usd} onChange={onChange} inputMode="numeric" placeholder="e.g., 1800" /></label>

            <label>Brand<input name="brand" value={form.brand} onChange={onChange} placeholder="e.g., Juliana / Liv" /></label>
            <label>Model<input name="model" value={form.model} onChange={onChange} placeholder="e.g., Roubion / Pique" /></label>

            <label>Year<input name="year" value={form.year} onChange={onChange} inputMode="numeric" placeholder="e.g., 2021" /></label>
            <label>Size<input name="size" value={form.size} onChange={onChange} placeholder="e.g., S / M / L" /></label>

            <label>State (2 letters)<input name="state" value={form.state} onChange={onChange} maxLength={2} placeholder="e.g., NJ" /></label>
            <label>ZIP (5 digits)<input name="zip" value={form.zip} onChange={onChange} maxLength={5} placeholder="e.g., 08544" /></label>

            <label>Wheel size<input name="wheel_size" value={form.wheel_size} onChange={onChange} placeholder="e.g., 27.5 / 29" /></label>
            <label>Condition<input name="condition" value={form.condition} onChange={onChange} placeholder="e.g., Excellent" /></label>

            <label>Frame size (in)<input name="frame_size_in" value={form.frame_size_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 16" /></label>
            <label>Rider height min (in)<input name="rider_height_min_in" value={form.rider_height_min_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 63" /></label>

            <label>Rider height max (in)<input name="rider_height_max_in" value={form.rider_height_max_in} onChange={onChange} inputMode="numeric" placeholder="e.g., 66" /></label>
            <label>Bike type<select name="bike_type" value={form.bike_type} onChange={onChange}>
              <option value="">—</option>
              <option value="MTB">MTB</option>
              <option value="ROAD">Road</option>
              <option value="GRAVEL">Gravel</option>
              <option value="HYBRID">Hybrid</option>
              <option value="OTHER">Other</option>
            </select></label>

            <label>Frame material<input name="frame_material" value={form.frame_material} onChange={onChange} placeholder="e.g., Carbon" /></label>
            <label>Rear derailleur<input name="drivetrain_rear" value={form.drivetrain_rear} onChange={onChange} placeholder="e.g., Shimano 105" /></label>

            <label>Brakes (model)<input name="brakes_model" value={form.brakes_model} onChange={onChange} placeholder="e.g., SRAM Level" /></label>
            <label>Saddle<input name="saddle" value={form.saddle} onChange={onChange} placeholder="e.g., Selle Italia Donna" /></label>

            <label>Weight (lb)<input name="weight_lb" value={form.weight_lb} onChange={onChange} inputMode="numeric" placeholder="e.g., 24.5" /></label>

            <label style={{ gridColumn: "1 / -1" }}>Description
              <textarea name="description" value={form.description} onChange={onChange} rows={3} placeholder="Condition, service history, any notes…" />
            </label>

            {/* Photos */}
            <label style={{ gridColumn: "1 / -1" }}>
              Photos (up to {MAX_PHOTOS})
              <input type="file" accept="image/*" multiple onChange={onPickPhotos} />
              { (photoURLs.length + photoFiles.length) > 0 && (
                <>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {/* already-uploaded URLs first */}
                    {photoURLs.map((u, i) => (
                      <div key={`u-${i}`} className="card" style={{ padding: 6, width: 160 }}>
                        <img src={fullUrl(u)} alt={`photo ${i + 1}`} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }} />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>uploaded</span>
                          <button type="button" onClick={() => removePhoto(i)} style={{ fontSize: 12 }}>Remove</button>
                        </div>
                      </div>
                    ))}
                    {/* local files not uploaded yet */}
                    {photoFiles.map((f, idx) => (
                      <div key={`f-${idx}`} className="card" style={{ padding: 6, width: 160 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {(f.size / 1024).toFixed(0)} KB {isTooBig(f) && <span style={{ color: "crimson", marginLeft: 6 }}>(too big)</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(photoURLs.length + idx)}
                          style={{ fontSize: 12, marginTop: 6 }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPhotoFiles([]); setPhotoURLs([]); }}
                    style={{ fontSize: 12, marginTop: 6 }}
                  >
                    Clear all photos
                  </button>
                </>
              )}
            </label>
          </div>

          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Listing"}</button>
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
        <div className="card">No bikes found.</div>
      ) : (
        <div className="grid-cards">
          {bikes.map((b) => (
            <article key={b.id} className="card bike-card">
              <header className="bike-card__header">
                <h3 className="bike-card__title">
                  <Link to={`/bikes/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {b.title}
                  </Link>
                </h3>
                {typeof b.price_usd === "number" && (
                  <div className="bike-card__price">${b.price_usd.toLocaleString()}</div>
                )}
              </header>

              {/* thumbnail */}
              {Array.isArray(b.photos) && b.photos[0] && (
                <div style={{ margin: "8px 0" }}>
                  <img
                    src={fullUrl(b.photos[0])}
                    alt={b.title}
                    style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }}
                    loading="lazy"
                  />
                </div>
              )}

              <ul className="bike-card__meta">
                {b.brand && <li><strong>Brand:</strong> {b.brand}</li>}
                {b.model && <li><strong>Model:</strong> {b.model}</li>}
                {b.year && <li><strong>Year:</strong> {b.year}</li>}
                {b.size && <li><strong>Size:</strong> {b.size}</li>}
                {b.state && <li><strong>State:</strong> {b.state}</li>}
                {b.zip && <li><strong>ZIP:</strong> {b.zip}</li>}
              </ul>
              {b.owner_email && (
                <footer style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
                  listed by <strong>{b.owner_email === userEmail ? "you" : b.owner_email}</strong>
                </footer>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

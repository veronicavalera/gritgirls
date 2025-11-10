import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function fullUrl(u) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API}${u}`;
}

function inchesToFeet(inches){
  if (inches == null) return null;
  const ft = Math.floor(inches/12), inch = inches % 12;
  return `${ft}'${inch}"`;
}

export default function BikeDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, userEmail } = useAuth();

  const [bike, setBike] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // edit mode + form fields
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ title: "", price_usd: "", description: "" });

  // photo state for editing
  const [photoURLs, setPhotoURLs] = useState([]);   // already uploaded (relative)
  const [photoFiles, setPhotoFiles] = useState([]); // File[] not yet uploaded
  const MAX_PHOTOS = 3;
  const MAX_MB = 5;

  const photos = Array.isArray(bike?.photos) ? bike.photos : [];
  const [idx, setIdx] = useState(0);

  useEffect(() => { if (idx >= photos.length) setIdx(0); }, [photos.length, idx]);

  useEffect(() => {
    (async () => {
      try{
        const res = await fetch(`${API}/api/bikes/${id}`);
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || "Not found");
        setBike(data);
        setForm({ title: data.title || "", price_usd: data.price_usd ?? "", description: data.description || "" });
        setPhotoURLs(Array.isArray(data.photos) ? data.photos : []);
      }catch(e){ setErr(e.message); }
    })();
  }, [id]);

  const goPrev = useCallback(() => {
    if (photos.length === 0) return;
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    if (photos.length === 0) return;
    setIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    function onKey(e){
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  if(err) return <div className="card">Error: {err}</div>;
  if(!bike) return <div className="card">Loading…</div>;

  const isOwner = !!userEmail && bike.owner_email === userEmail;

  const heightRange = (bike.rider_height_min_in && bike.rider_height_max_in)
    ? `${inchesToFeet(bike.rider_height_min_in)} – ${inchesToFeet(bike.rider_height_max_in)}`
    : null;

  function onChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function isTooBig(file) {
    return file.size > MAX_MB * 1024 * 1024;
  }

  function onPickPhotos(e) {
    setErr("");
    const files = Array.from(e.target.files || []);

    const tooBig = files.filter(isTooBig);
    const ok = files.filter(f => !isTooBig(f));
    if (tooBig.length > 0) {
      const names = tooBig.map(f => f.name).join(", ");
      setErr(`Skipped oversized images (> ${MAX_MB}MB): ${names}`);
    }
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
    return data.url; // relative
  }

  async function removePhoto(index) {
    setErr("");
    if (index < photoURLs.length) {
      // delete uploaded file server-side
      const absolute = fullUrl(photoURLs[index]);
      const pathname = new URL(absolute).pathname;
      const filename = pathname.split("/").pop();
      try {
        await fetch(`${API}/api/uploads/${filename}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
      const nextURLs = [...photoURLs];
      nextURLs.splice(index, 1);
      setPhotoURLs(nextURLs);
    } else {
      const localIndex = index - photoURLs.length;
      const nextFiles = [...photoFiles];
      nextFiles.splice(localIndex, 1);
      setPhotoFiles(nextFiles);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setErr("");
    if (!token) return setErr("Please log in.");

    try {
      setSaving(true);

      // upload any new local files
      let urls = [...photoURLs];
      for (let i = 0; i < photoFiles.length && urls.length < MAX_PHOTOS; i++) {
        const f = photoFiles[i];
        if (!f.type.startsWith("image/")) throw new Error("Only image files are allowed.");
        if (isTooBig(f)) throw new Error(`Each image must be ≤ ${MAX_MB}MB.`);
        const url = await uploadOne(f);
        urls.push(url);
      }
      urls = urls.slice(0, MAX_PHOTOS);

      const payload = {
        title: form.title?.trim(),
        price_usd: form.price_usd === "" ? null : Number(form.price_usd),
        description: form.description?.trim(),
        photos: urls,
      };

      const res = await fetch(`${API}/api/bikes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");

      setBike(data);
      setPhotoURLs(Array.isArray(data.photos) ? data.photos : []);
      setPhotoFiles([]);
      setEditMode(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!token) return setErr("Please log in.");
    const ok = window.confirm("Delete this listing? This cannot be undone.");
    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/bikes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      navigate("/bikes");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ display:"grid", gap:12 }}>
      <Link to="/bikes" style={{ fontSize: 14 }}>&larr; Back to Bikes</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h2 style={{ marginBottom: 0 }}>{bike.title}</h2>
        {isOwner && !editMode && (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setEditMode(true)}>Edit</button>
            <button type="button" onClick={onDelete} style={{ background: "#fee2e2", color: "#991b1b" }}>
              Delete
            </button>
          </div>
        )}
      </div>

      {err && <div className="error">{err}</div>}

      {/* View mode */}
      {!editMode && (
        <>
          {/* Carousel */}
          {photos.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ position: "relative", width: "100%", height: 360, borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}>
                <img
                  key={idx}
                  src={fullUrl(photos[idx])}
                  alt={`${bike.title} photo ${idx + 1} of ${photos.length}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button type="button" aria-label="Previous image" onClick={goPrev} style={navBtnStyle("left")}>‹</button>
                <button type="button" aria-label="Next image" onClick={goNext} style={navBtnStyle("right")}>›</button>
                <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
                  {photos.map((_, i) => (
                    <button key={i} type="button" onClick={() => setIdx(i)}
                      aria-label={`Go to image ${i + 1}`}
                      style={{ width: 8, height: 8, borderRadius: "999px", border: "none", padding: 0, cursor: "pointer",
                               background: i === idx ? "black" : "rgba(0,0,0,0.3)" }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Meta */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {typeof bike.price_usd === "number" && <span className="bike-card__price">${bike.price_usd.toLocaleString()}</span>}
            {bike.brand && <span><strong>Brand:</strong> {bike.brand}</span>}
            {bike.model && <span><strong>Model:</strong> {bike.model}</span>}
            {bike.year && <span><strong>Year:</strong> {bike.year}</span>}
            {bike.size && <span><strong>Size (label):</strong> {bike.size}</span>}
            {bike.frame_size_in && <span><strong>Frame Size:</strong> {bike.frame_size_in}"</span>}
            {bike.state && <span><strong>State:</strong> {bike.state}</span>}
            {bike.zip && <span><strong>ZIP:</strong> {bike.zip}</span>}
            {bike.condition && <span><strong>Condition:</strong> {bike.condition}</span>}
            {heightRange && <span><strong>Rider Height:</strong> {heightRange}</span>}
            {bike.owner_email && <span><strong>Listed by:</strong> {bike.owner_email}</span>}
          </div>

          {bike.description && <p style={{ marginTop: 8 }}>{bike.description}</p>}

          <h3>Detailed Specifications</h3>
          <div className="grid-2">
            {bike.bike_type && <Spec label="Bike Type" value={bike.bike_type} />}
            {bike.frame_material && <Spec label="Frame Material" value={bike.frame_material} />}
            {bike.wheel_size && <Spec label="Wheel Size" value={bike.wheel_size} />}
            {bike.drivetrain_rear && <Spec label="Rear Derailleur" value={bike.drivetrain_rear} />}
            {bike.brakes_model && <Spec label="Brakes (Brand/Model)" value={bike.brakes_model} />}
            {bike.saddle && <Spec label="Saddle" value={bike.saddle} />}
            {bike.weight_lb != null && <Spec label="Weight" value={`${bike.weight_lb} lb`} />}
          </div>
        </>
      )}

      {/* Edit mode */}
      {editMode && (
        <form onSubmit={onSave} className="card form-card">
          <h3 style={{ marginTop: 0 }}>Edit listing</h3>

          <div className="grid-2">
            <label>Title*<input name="title" value={form.title} onChange={onChange} required /></label>
            <label>Price (USD)<input name="price_usd" value={form.price_usd} onChange={onChange} inputMode="numeric" /></label>

            <label style={{ gridColumn: "1 / -1" }}>Description
              <textarea name="description" value={form.description} onChange={onChange} rows={3} />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Photos (up to {MAX_PHOTOS})
              <input type="file" accept="image/*" multiple onChange={onPickPhotos} />
              {(photoURLs.length + photoFiles.length) > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {photoURLs.map((u, i) => (
                    <div key={`u-${i}`} className="card" style={{ padding: 6, width: 160 }}>
                      <img src={fullUrl(u)} alt={`photo ${i + 1}`} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>uploaded</span>
                        <button type="button" onClick={() => removePhoto(i)} style={{ fontSize: 12 }}>Remove</button>
                      </div>
                    </div>
                  ))}
                  {photoFiles.map((f, idx) => (
                    <div key={`f-${idx}`} className="card" style={{ padding: 6, width: 160 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {(f.size / 1024).toFixed(0)} KB {isTooBig(f) && <span style={{ color: "crimson", marginLeft: 6 }}>(too big)</span>}
                      </div>
                      <button type="button" onClick={() => removePhoto(photoURLs.length + idx)} style={{ fontSize: 12, marginTop: 6 }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" onClick={() => { setEditMode(false); setErr(""); setPhotoFiles([]); setPhotoURLs(Array.isArray(bike.photos)? bike.photos:[]); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Spec({label, value}){
  return (
    <div className="card" style={{ padding:"10px 12px" }}>
      <div style={{ fontSize:12, color:"var(--muted)" }}>{label}</div>
      <div style={{ fontWeight:600 }}>{value}</div>
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 8,
    width: 36,
    height: 36,
    borderRadius: "999px",
    background: "rgba(0,0,0,0.5)",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: "36px",
    textAlign: "center",
    userSelect: "none",
  };
}

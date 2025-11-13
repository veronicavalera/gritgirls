// client/pages/Bikes.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { Section, Card, CardHeader, CardContent, Badge, Button, Field, Input, EmptyState } from "../ui/UiKit.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function fullUrl(u) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API}${u}`;
}

export default function Bikes() {
  const { userEmail } = useAuth();
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  async function loadBikes(stateArg = "") {
    try {
      setErr(""); setLoading(true);
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

  useEffect(() => { loadBikes(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <Section
        title="Bike Marketplace"
        subtitle="Browse bikes listed by women riders. Filter by state or jump in and create your own listing."
        right={<Link to="/bikes/new"><Button>+ New Listing</Button></Link>}
      >
        <Card>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); loadBikes(); }}
              style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}
            >
              <Field label="Filter by state">
                <Input
                  name="stateFilter"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  maxLength={2}
                  placeholder="e.g., NJ"
                  style={{ width: 100 }}
                />
              </Field>
              <Button type="submit">Apply</Button>
              {stateFilter && (
                <Button
                  type="button"
                  variant="neutral"
                  onClick={() => { setStateFilter(""); loadBikes(""); }}
                >
                  Clear
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </Section>

      <Section title="Listings">
        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

        {loading ? (
          <Card><CardContent>Loading bikes…</CardContent></Card>
        ) : bikes.length === 0 ? (
          <EmptyState
            title="No bikes found"
            body="Try clearing the filter or be the first to list a bike."
            action={<Link to="/bikes/new"><Button>+ Create listing</Button></Link>}
          />
        ) : (
          <div className="grid-cards">
            {bikes.map((b) => (
              <Card key={b.id} className="bike-card">
                <CardHeader
                  overline={b.brand || "Bike"}
                  title={
                    <Link to={`/bikes/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {b.title}
                    </Link>
                  }
                  aside={typeof b.price_usd === "number" ? <Badge tone="success">${b.price_usd.toLocaleString()}</Badge> : null}
                />
                <CardContent>
                  {Array.isArray(b.photos) && b.photos[0] && (
                    <img
                      src={fullUrl(b.photos[0])}
                      alt={b.title}
                      style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, marginBottom: 10 }}
                      loading="lazy"
                    />
                  )}
                  <ul className="bike-card__meta">
                    {b.model && <li><strong>Model:</strong> {b.model}</li>}
                    {b.year && <li><strong>Year:</strong> {b.year}</li>}
                    {b.size && <li><strong>Size:</strong> {b.size}</li>}
                    {b.state && <li><strong>State:</strong> {b.state}</li>}
                    {b.zip && <li><strong>ZIP:</strong> {b.zip}</li>}
                  </ul>
                  {b.owner_email && (
                    <div style={{ marginTop: 10, fontSize: 13, color: "var(--ui-muted)" }}>
                      listed by <strong>{b.owner_email === userEmail ? "you" : b.owner_email}</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Link to={`/bikes/${b.id}`}><Button variant="neutral">View</Button></Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

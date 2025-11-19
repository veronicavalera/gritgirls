// client/pages/Rides.jsx
// Purpose: Browse community rides, filter by state, RSVP/un-RSVP,
// and (for ride owners) peek at the attendee list.
//
// Key ideas:
// - Fetch rides from /api/rides (optionally filtered by ?state=XX)
// - Show "RSVP / Un-RSVP" which hits POST /api/rides/:id/rsvp (toggle)
// - If you're the ride owner, you can expand an attendee list panel
// - Uses UiKit components for consistent styling

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  Section, Card, CardHeader, CardContent,
  Field, Input, Button, Badge, EmptyState
} from "../ui/UiKit.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Rides() {
  const { token, userId } = useAuth();             // token = auth for RSVP; userId helps decide owner-only UI
  const [rides, setRides] = useState([]);          // list of rides to display
  const [loading, setLoading] = useState(true);    // spinner flag
  const [err, setErr] = useState("");              // human-friendly error
  const [stateFilter, setStateFilter] = useState("");// 2-letter state filter

  // Fetch rides from the server, optionally applying a state filter.
  async function loadRides(stateArg = "") {
    try {
      setErr("");
      setLoading(true);

      const url = new URL(`${API}/api/rides`);
      // Prefer incoming arg, otherwise the controlled input; normalize to 2-letter uppercase
      const s = (stateArg || stateFilter || "").trim().toUpperCase().slice(0, 2);
      if (s) url.searchParams.set("state", s);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load rides");

      setRides(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Initial load on mount
  useEffect(() => { loadRides(); /* eslint-disable-next-line */ }, []);

  // Toggle RSVP for a given ride (requires auth token).
  async function toggleRSVP(rideId) {
    if (!token) return setErr("Please log in to RSVP.");
    try {
      setErr("");
      const res = await fetch(`${API}/api/rides/${rideId}/rsvp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update RSVP");

      // Re-fetch rides so attendee counts update without a manual refresh.
      await loadRides();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <>
      {/* Top section: header + filter form */}
      <Section
        title="Group Rides"
        subtitle="Find women’s rides near you and RSVP to join."
        right={<a href="/rides/new"><Button>+ New Ride</Button></a>}
      >
        <Card>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); loadRides(); }}
              style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}
            >
              <Field label="Filter by state">
                <Input
                  name="stateFilter"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  maxLength={2}
                  placeholder="e.g., CO"
                  style={{ width: 100 }}
                />
              </Field>
              <Button type="submit">Apply</Button>
              {stateFilter && (
                <Button
                  type="button"
                  variant="neutral"
                  onClick={() => { setStateFilter(""); loadRides(""); }}
                >
                  Clear
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </Section>

      {/* Results section */}
      <Section title="Upcoming rides">
        {/* Inline error banner */}
        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}

        {/* Loading / empty / grid states */}
        {loading ? (
          <Card><CardContent>Loading rides…</CardContent></Card>
        ) : rides.length === 0 ? (
          <EmptyState
            title="No rides yet"
            body="Start one for your local community."
            action={<a href="/rides/new"><Button>+ Create ride</Button></a>}
          />
        ) : (
          <div className="grid-cards">
            {rides.map((r) => (
              <Card key={r.id}>
                <CardHeader
                  overline={r.state || "Ride"}
                  title={r.title}
                  aside={<Badge tone="brand">{r.attendee_count ?? 0} attending</Badge>}
                />
                <CardContent>
                  {/* Simple metadata list */}
                  <ul className="ride-card__meta">
                    {r.date && <li><strong>Date:</strong> {r.date}</li>}
                    {r.time && <li><strong>Time:</strong> {r.time}</li>}
                    {r.difficulty && <li><strong>Difficulty:</strong> {r.difficulty}</li>}
                    {r.terrain && <li><strong>Terrain:</strong> {r.terrain}</li>}
                    {r.zip_prefix && <li><strong>ZIP:</strong> {r.zip_prefix}</li>}
                  </ul>

                  {/* Actions: RSVP always (if logged in), attendee list if you're the owner */}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <Button onClick={() => toggleRSVP(r.id)}>RSVP / Un-RSVP</Button>
                    {userId && r.owner_id === userId && <OwnerAttendeesBadge rideId={r.id} token={token} />}
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

// --- Small inline component (owner-only helper) -------------------------------
// Purpose: When the owner clicks "View attendees", fetch the ride detail
// (which includes attendees for the owner) and render a simple list.
import { useEffect as useEffect2, useState as useState2 } from "react";
function OwnerAttendeesBadge({ rideId, token }) {
  const [open, setOpen] = useState2(false);     // whether the sub-card is shown
  const [loading, setLoading] = useState2(false);
  const [list, setList] = useState2([]);        // attendee emails

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/rides/${rideId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      // Backend only returns `attendees` array if you're the owner; handle both cases.
      if (res.ok && Array.isArray(data.attendees)) setList(data.attendees);
      else setList([]);
    } finally {
      setLoading(false);
    }
  }

  // Lazy-load attendees when we first open the panel
  useEffect2(() => { if (open) load(); }, [open]);

  return (
    <div>
      <Button variant="neutral" onClick={() => setOpen(v => !v)}>
        {open ? "Hide attendees" : "View attendees"}
      </Button>

      {open && (
        <Card style={{ marginTop: 8 }}>
          <CardContent>
            {loading ? "Loading…" : (
              list.length === 0 ? "No RSVPs yet." : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {list.map(a => (<li key={a.id}>{a.email}</li>))}
                </ul>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

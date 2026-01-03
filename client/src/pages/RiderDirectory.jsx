// client/src/pages/RiderDirectory.jsx
import { useEffect, useMemo, useState } from "react";
import { Container, Section, Field, Input, Select, Button, Card, CardContent, EmptyState, Row, Badge } from "../ui/UiKit.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function RiderDirectory() {
  const auth = useAuth();
  // Your AuthContext might not expose `token` directly, so we safely fallback:
  const token = auth?.token || localStorage.getItem("token");

  const [stateFilter, setStateFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (stateFilter) p.set("state", stateFilter);
    if (levelFilter) p.set("level", levelFilter);
    if (q.trim()) p.set("q", q.trim());
    p.set("limit", "100");
    p.set("offset", "0");
    return p;
  }, [stateFilter, levelFilter, q]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      if (!token) {
        setError("Please log in to view the rider directory.");
        setRows([]);
        setTotal(0);
        return;
      }

      const res = await fetch(`${API_BASE}/api/riders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to load riders.");
        setRows([]);
        setTotal(0);
        return;
      }

      setRows(data.results || []);
      setTotal(data.total || 0);
    } catch {
      setError("Network error loading riders.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function clearFilters() {
    setStateFilter("");
    setLevelFilter("");
    setQ("");
  }

  return (
    <Container>
      <Section
        title="Rider Directory"
        subtitle="Filter by state and experience level to discover riders on your level."
        right={
          <Badge tone="neutral">
            {loading ? "Loading…" : `${rows.length} / ${total}`}
          </Badge>
        }
      >
        <Card>
          <CardContent>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr 1fr auto" }}>
              <Field label="Search (email or zip)">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. 085 or gmail"
                />
              </Field>

              <Field label="State">
                <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  <option value="">Any</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Level">
                <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                  <option value="">Any</option>
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </Select>
              </Field>

              <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                <Button variant="neutral" onClick={clearFilters} type="button">
                  Clear
                </Button>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 10, color: "crimson" }}>
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <div style={{ height: 14 }} />

        {(!loading && !error && rows.length === 0) ? (
          <EmptyState
            title="No riders found"
            body="Try a different state/level, or create a few profiles to demo."
          />
        ) : (
          <Card>
            <CardContent padded={false}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>First Name</Th>
                    <Th>Email</Th>
                    <Th>ZIP</Th>
                    <Th>State</Th>
                    <Th>Level</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user_id}>
                      <Td>{r.first_name || ""}</Td>
                      <Td>{r.email || ""}</Td>
                      <Td>{r.zip_prefix || ""}</Td>
                      <Td>{r.state || ""}</Td>
                      <Td>{r.experience_level || r.level || ""}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </Section>
    </Container>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 14px",
        fontSize: 12,
        color: "var(--ui-muted)",
        borderBottom: "1px solid var(--ui-border)",
        background: "rgba(0,0,0,0.02)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td
      style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--ui-border)",
        fontSize: 14,
      }}
    >
      {children}
    </td>
  );
}

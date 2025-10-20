import { NavLink, Outlet, Link } from "react-router-dom";

export default function App() {
  const email = localStorage.getItem("userEmail");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    window.location.href = "/"; // simple refresh to update nav
  }

  return (
    <div className="app">
      <header className="header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Grit Girls</h1>

        <nav className="nav" style={{ display: "flex", gap: 12 }}>
          <NavLink to="/" className={({ isActive }) => `link ${isActive ? "active" : ""}`} end>
            Home
          </NavLink>
          <NavLink to="/bikes" className={({ isActive }) => `link ${isActive ? "active" : ""}`}>
            Bikes
          </NavLink>
          <NavLink to="/rides" className={({ isActive }) => `link ${isActive ? "active" : ""}`}>
            Rides
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `link ${isActive ? "active" : ""}`}>
            Profile
          </NavLink>
        </nav>

        {/* Auth area (right side) */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {email ? (
            <>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{email}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <Link className="link" to="/login">Login</Link>
          )}
        </div>
      </header>

      <main className="main">
        <div className="card">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} GritGirls
      </footer>
    </div>
  );
}

// client/App.jsx
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";

export default function App() {
  const { userEmail, logout } = useAuth();

  return (
    <div className="app">
      <header className="header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <h1 style={{ fontSize: 30, margin: 0 }}>GritGirls</h1>
        </Link>

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

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {userEmail ? (
            <>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{userEmail}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="link" to="/login">Login</Link>
              <Link className="link" to="/signup">Signup</Link>
            </>
          )}
        </div>
      </header>

      {/* Let each page control its own cards/sections */}
      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">© {new Date().getFullYear()} GritGirls</footer>
    </div>
  );
}

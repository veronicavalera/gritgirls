import { NavLink, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1 style={{ fontSize: 30, margin: 0 }}>Grit Girls</h1>
        <nav className="nav">
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

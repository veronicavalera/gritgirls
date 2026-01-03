// App.jsx (header part only)
import { Navbar, NavLinkPill, Container, Button } from "./ui/UiKit.jsx";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";

export default function App() {
  const { userEmail, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="app">
      <Navbar
        brand={
          <Link to="/" style={{ textDecoration: "none" }}>
            GritGirls
          </Link>
        }
        right={
          userEmail ? (
            <>
              <span style={{ fontSize: 14, color: "var(--ui-muted)" }}>{userEmail}</span>
              <Button onClick={logout} variant="neutral">
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button>Login</Button>
            </Link>
          )
        }
      >
        <NavLinkPill href="/" className="" active={pathname === "/"}>
          Home
        </NavLinkPill>
        <NavLinkPill href="/bikes" active={pathname.startsWith("/bikes")}>
          Bikes
        </NavLinkPill>
        <NavLinkPill href="/rides" active={pathname.startsWith("/rides")}>
          Rides
        </NavLinkPill>

        {/* NEW: Rider Directory */}
        <NavLinkPill href="/riders" active={pathname.startsWith("/riders")}>
          Riders
        </NavLinkPill>

        <NavLinkPill href="/profile" active={pathname.startsWith("/profile")}>
          Profile
        </NavLinkPill>
      </Navbar>

      <Container>
        <Outlet />
      </Container>

      <footer className="footer">© {new Date().getFullYear()} GritGirls</footer>
    </div>
  );
}

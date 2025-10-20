import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  // Load from localStorage once on mount
  useEffect(() => {
    const t = localStorage.getItem("token");
    const e = localStorage.getItem("userEmail");
    if (t) setToken(t);
    if (e) setUserEmail(e);
  }, []);

  // Helper to set both state + localStorage
  function setAuth({ token: t, userEmail: e }) {
    setToken(t);
    setUserEmail(e);
    if (t) localStorage.setItem("token", t);
    if (e) localStorage.setItem("userEmail", e);
  }

  // Helper to clear both
  function logout() {
    setToken(null);
    setUserEmail(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
  }

  return (
    <AuthContext.Provider value={{ token, userEmail, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/* (AuthContext + JWT)

How it works: user signs up / logs in → backend returns a JWT → AuthContext stores it (and the email/id)
  injects the Authorization: Bearer … header on API calls, and exposes helpers like login(), logout(), userEmail, token.

What is it: A React Context + hook (useAuth) that any component can read to know:
    1. token (the JWT you got from the backend)
    2. userEmail / userId
    3. login(), signup(), logout() helpers

Pros: simple, fully under my control, no vendor lock-in, easy to run locally and on Render
sources: https://playwright.dev/python/docs/auth
https://www.permit.io/blog/best-practices-for-authorization-in-python
https://www.loginradius.com/blog/engineering/guest-post/user-authentication-in-python
https://dev.to/sanjayttg/jwt-authentication-in-react-with-react-router
*/ 

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// used ChatGPT to help generate the idea behind this logic
// used last source above to help implement 
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

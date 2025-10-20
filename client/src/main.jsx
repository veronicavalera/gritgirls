import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Bikes from "./pages/Bikes.jsx";
import Rides from "./pages/Rides.jsx";
import Profile from "./pages/Profile.jsx";
import "./index.css";
import Login from "./pages/Login.jsx";




const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "bikes", element: <Bikes /> },
      { path: "rides", element: <Rides /> },
      { path: "profile", element: <Profile /> },
      { path: "login", element: <Login /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

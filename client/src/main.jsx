// client/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.jsx";
import Home from "./pages/Home.jsx";

// Bikes
import Bikes from "./pages/Bikes.jsx";
import BikesNew from "./pages/BikesNew.jsx";
import BikeDetail from "./pages/BikeDetail.jsx";

// Rides
import Rides from "./pages/Rides.jsx";
import RidesNew from "./pages/RidesNew.jsx";

// Auth & Profile
import Profile from "./pages/Profile.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

// Payments
import PayListing from "./pages/PayListing.jsx";
import PaySuccess from "./pages/PaySuccess.jsx";

import { AuthProvider } from "./auth/AuthContext.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },

      // Bikes
      { path: "bikes", element: <Bikes /> },
      { path: "bikes/new", element: <BikesNew /> },
      { path: "bikes/:id", element: <BikeDetail /> },

      // Rides
      { path: "rides", element: <Rides /> },
      { path: "rides/new", element: <RidesNew /> },

      // Auth & Profile
      { path: "profile", element: <Profile /> },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },

      // Payments
      { path: "pay/:id", element: <PayListing /> },
      { path: "pay/success", element: <PaySuccess /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);

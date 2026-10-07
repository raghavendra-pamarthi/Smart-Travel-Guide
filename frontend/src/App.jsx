import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import UserLayout from "./layouts/UserLayout";
import GuideLayout from "./layouts/GuideLayout";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserDashboard from "./pages/UserDashboard";
import Profile from "./pages/Profile";
import UserPackages from "./pages/UserPackages";
import SearchPlaces from "./pages/SearchPlaces";
import MyTrips from "./pages/MyTrips";
import Recommendations from "./pages/Recommendations";
import SuggestPlace from "./pages/SuggestPlace";
import MyContributions from "./pages/MyContributions";
import Roadmap from "./pages/Roadmap";
import GuideDashboard from "./pages/GuideDashboard";
import GuideRequests from "./pages/GuideRequests";
import GuideBookings from "./pages/GuideBookings";
import PlaceDetails from "./pages/PlaceDetails";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { getServerSession, getUser, isLoggedIn } from "./utils";

function Protected({ children, role }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  try {
    const user = getUser() || {};
    const actualRole = user.role || "user";
    if (role && actualRole !== role) {
      return <Navigate to={actualRole === "guide" ? "/guide" : "/user"} replace />;
    }
  } catch {}
  return children;
}

function AdminProtected({ children }) {
  const ok = sessionStorage.getItem("stg_admin_authenticated") === "true";
  return ok ? children : <Navigate to="/admin/login" replace />;
}

function PlaceDetailsWrapper() {
  const loggedIn = isLoggedIn();
  const user = getUser() || {};
  const isGuide = loggedIn && user.role === "guide";

  if (isGuide) {
    return (
      <GuideLayout>
        <PlaceDetails />
      </GuideLayout>
    );
  }

  if (loggedIn) {
    return (
      <UserLayout>
        <PlaceDetails />
      </UserLayout>
    );
  }

  return (
    <PublicLayout>
      <PlaceDetails />
    </PublicLayout>
  );
}

export default function App() {
  const location = useLocation();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      setSessionChecked(true);
      return;
    }
    getServerSession().finally(() => setSessionChecked(true));
  }, [location.pathname]);

  if (!sessionChecked) {
    return null;
  }

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/place/:id" element={<PlaceDetailsWrapper />} />

      {/* Authentication Pages (Standalone full-page layouts) */}
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin Pages */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminProtected><AdminPanel /></AdminProtected>} />
      <Route path="/admin/:section" element={<AdminProtected><AdminPanel /></AdminProtected>} />

      {/* Traveller / User Pages (Protected with UserLayout) */}
      <Route path="/user" element={<Protected role="user"><UserLayout><UserDashboard /></UserLayout></Protected>} />
      <Route path="/user/search" element={<Protected role="user"><UserLayout><SearchPlaces /></UserLayout></Protected>} />
      <Route path="/user/packages" element={<Protected role="user"><UserLayout><UserPackages /></UserLayout></Protected>} />
      <Route path="/user/roadmap" element={<Protected role="user"><UserLayout><Roadmap /></UserLayout></Protected>} />
      <Route path="/user/trips" element={<Protected role="user"><UserLayout><MyTrips /></UserLayout></Protected>} />
      <Route path="/user/recommendations" element={<Protected role="user"><UserLayout><Recommendations /></UserLayout></Protected>} />
      <Route path="/user/recommendations/places" element={<Protected role="user"><UserLayout><Recommendations mode="places" /></UserLayout></Protected>} />
      <Route path="/user/recommendations/packages" element={<Protected role="user"><UserLayout><Recommendations mode="packages" /></UserLayout></Protected>} />
      <Route path="/user/suggest-place" element={<Protected role="user"><UserLayout><SuggestPlace /></UserLayout></Protected>} />
      <Route path="/user/contributions" element={<Protected role="user"><UserLayout><MyContributions /></UserLayout></Protected>} />
      <Route path="/user/profile" element={<Protected role="user"><UserLayout><Profile /></UserLayout></Protected>} />

      {/* Local Guide Pages (Protected with GuideLayout) */}
      <Route path="/guide" element={<Protected role="guide"><GuideLayout><GuideDashboard /></GuideLayout></Protected>} />
      <Route path="/guide/requests" element={<Protected role="guide"><GuideLayout><GuideRequests /></GuideLayout></Protected>} />
      <Route path="/guide/bookings" element={<Protected role="guide"><GuideLayout><GuideBookings /></GuideLayout></Protected>} />
      <Route path="/guide/contributions" element={<Protected role="guide"><GuideLayout><MyContributions /></GuideLayout></Protected>} />
      <Route path="/guide/profile" element={<Protected role="guide"><GuideLayout><Profile /></GuideLayout></Protected>} />

      {/* 404 Catch-All Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

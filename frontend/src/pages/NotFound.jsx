import React from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";
import { getUser, isLoggedIn } from "../utils";

export default function NotFound() {
  const navigate = useNavigate();
  const user = getUser();
  const loggedIn = isLoggedIn();
  const isAdmin = sessionStorage.getItem("stg_admin_authenticated") === "true";

  const homePath = isAdmin ? "/admin" : (loggedIn && user?.role === "guide") ? "/guide" : loggedIn ? "/user" : "/";
  const homeLabel = isAdmin ? "Admin Panel" : (loggedIn && user?.role === "guide") ? "Guide Dashboard" : loggedIn ? "My Dashboard" : "Return Home";

  return (
    <div className="not-found-container" style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-main, #041235)",
      color: "var(--text-main, #eef4ff)",
      position: "relative",
      overflow: "hidden"
    }}>
      <header style={{
        padding: "1.2rem 2.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.08)"
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit" }}>
          <BrandMark />
          <div>
            <strong style={{ fontSize: "16px", display: "block", color: "var(--text-main, #fff)" }}>Smart Travel Guide</strong>
            <small style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>Plan Smart, Travel Better</small>
          </div>
        </Link>
        <ThemeToggle compact />
      </header>

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center"
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          borderRadius: "999px",
          background: "rgba(99, 102, 241, 0.15)",
          border: "1px solid rgba(99, 102, 241, 0.35)",
          color: "#a5b4fc",
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "1.2rem"
        }}>
          <i className="bi bi-compass"></i> Route Lost in Navigation
        </div>

        <h1 style={{
          fontSize: "clamp(4rem, 10vw, 7rem)",
          fontWeight: "900",
          lineHeight: 1,
          margin: "0 0 1rem",
          background: "linear-gradient(135deg, #a5b4fc, #ec4899, #f43f5e)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
          fontWeight: "700",
          margin: "0 0 1rem",
          color: "var(--text-main, #ffffff)"
        }}>
          Destination Not Found
        </h2>

        <p style={{
          maxWidth: "520px",
          fontSize: "15px",
          lineHeight: 1.6,
          color: "var(--text-muted, #94a3b8)",
          margin: "0 0 2rem"
        }}>
          The page or travel route you are looking for does not exist, has been moved, or took an unexpected detour. Let us get you back on track.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-light"
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <i className="bi bi-arrow-left"></i> Go Back
          </button>

          <Link
            to={homePath}
            className="btn btn-primary"
            style={{
              padding: "10px 26px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
              background: "linear-gradient(135deg, #6366f1, #d946ef)",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)"
            }}
          >
            <i className="bi bi-house-door-fill"></i> {homeLabel}
          </Link>

          {!loggedIn && (
            <Link
              to="/login"
              className="btn btn-outline-primary"
              style={{
                padding: "10px 22px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <i className="bi bi-box-arrow-in-right"></i> Sign In
            </Link>
          )}
        </div>

        <div style={{
          marginTop: "3.5rem",
          padding: "1.2rem 2rem",
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          gap: "24px",
          fontSize: "12px",
          color: "var(--text-muted, #94a3b8)",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}><i className="bi bi-globe me-1"></i> Public Catalog</Link>
          <span>•</span>
          <Link to="/user/search" style={{ color: "inherit", textDecoration: "none" }}><i className="bi bi-search me-1"></i> Search Attractions</Link>
          <span>•</span>
          <Link to="/admin/login" style={{ color: "inherit", textDecoration: "none" }}><i className="bi bi-shield-lock me-1"></i> Admin Portal</Link>
        </div>
      </main>
    </div>
  );
}

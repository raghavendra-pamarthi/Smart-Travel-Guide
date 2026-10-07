import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUser, logoutSession, setLoggedIn, fetchNotifications } from "../utils";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";

export default function GuideNavbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount,setUnreadCount]=useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser() || {};
  React.useEffect(()=>{const load=async()=>setUnreadCount((await fetchNotifications()).filter(n=>!n.read).length);load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[]);

  async function logout() {
    await logoutSession();
    setLoggedIn(false);
    navigate("/");
  }

  const navLinks = [
    { to: "/guide", icon: "bi-house-door", label: "Dashboard" },
    { to: "/guide/bookings", icon: "bi-clipboard-check", label: "My Bookings" },
    { to: "/guide/contributions", icon: "bi-geo-alt", label: "Contributions" },
    { to: "/guide/profile", icon: "bi-person", label: "Profile" }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="public-navbar user-navbar guide-navbar" style={{
        background: "rgba(5, 20, 59, 0.95)",
        borderBottom: "1px solid rgba(130, 100, 255, 0.25)"
      }}>
        <button
          className="menu-btn nav-menu-left"
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
        >
          <i className="bi bi-list"></i>
        </button>

        <Link to="/guide" className="brand">
          <BrandMark />
          <span>
            <strong>Smart <b>Guide</b> Portal</strong>
            <small>Local Guide Dashboard</small>
          </span>
        </Link>

        <nav className="desktop-nav">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={isActive(link.to) ? "active" : ""}
              style={{
                color: isActive(link.to) ? "#b899ff" : "inherit",
                fontWeight: isActive(link.to) ? "700" : "500"
              }}
            >
              <i className={`bi ${link.icon} me-1`}></i>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="user-nav-right">
          <ThemeToggle compact />
          <button className="icon-btn guide-nav-notification" onClick={()=>navigate("/guide/bookings")} title="My Bookings notifications"><i className="bi bi-bell-fill"/>{unreadCount>0&&<b>{unreadCount}</b>}</button>
          <button
            className="user-chip guide-user-chip"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              borderColor: "rgba(140, 110, 255, 0.4)",
              background: "rgba(15, 37, 96, 0.6)"
            }}
          >
            {user?.avatarData ? (
              <img className="avatar avatar-image" src={user.avatarData} alt="Profile" />
            ) : (
              <span className="avatar" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                {(user?.name || "G").charAt(0)}
              </span>
            )}
            <span className="d-none d-md-inline">{user?.name?.split(" ")[0] || "Guide"}</span>
            <i className="bi bi-chevron-down"></i>
          </button>
        </div>
      </header>

      {profileOpen && (
        <div className="profile-popover" style={{ zIndex: 1000 }}>
          <div className="popover-user">
            {user?.avatarData ? (
              <img className="avatar large avatar-image" src={user.avatarData} alt="Profile" />
            ) : (
              <span className="avatar large" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                {(user?.name || "G").charAt(0)}
              </span>
            )}
            <div>
              <strong>{user?.name || "Local Guide"}</strong>
              <small>{user?.email || "guide@local"}</small>
            </div>
          </div>
          <Link to="/guide/profile" onClick={() => setProfileOpen(false)}>
            <i className="bi bi-person"></i> Guide Profile
          </Link>
          <Link to="/guide/contributions" onClick={() => setProfileOpen(false)}>
            <i className="bi bi-geo-alt"></i> My Contributions
          </Link>
          <Link to="/guide/bookings" onClick={() => setProfileOpen(false)}>
            <i className="bi bi-clipboard-check"></i> My Bookings
          </Link>
          <button onClick={logout}>
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      )}

      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)}></div>
          <aside className="user-drawer">
            <button className="drawer-close" onClick={() => setOpen(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
            <div className="drawer-profile">
              {user?.avatarData ? (
                <img className="avatar large avatar-image" src={user.avatarData} alt="Profile" />
              ) : (
                <span className="avatar large" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                  {(user?.name || "G").charAt(0)}
                </span>
              )}
              <div>
                <strong>{user?.name || "Local Guide"}</strong>
                <small>{user?.email || "Local Guide"}</small>
              </div>
            </div>
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
                <i className={`bi ${link.icon}`}></i> {link.label}
              </Link>
            ))}
            <hr />
            <button className="drawer-logout" onClick={logout}>
              <i className="bi bi-box-arrow-right"></i> Logout
            </button>
          </aside>
        </>
      )}
    </>
  );
}

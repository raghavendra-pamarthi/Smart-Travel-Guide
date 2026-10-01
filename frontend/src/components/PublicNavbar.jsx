import React, { useState } from "react";
import { Link } from "react-router-dom";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";

const menuItems = [
  ["#home", "bi-house", "Home"],
  ["#destinations", "bi-globe2", "Discover Places"],
  ["#guides", "bi-person-badge", "Find Local Guides"],
  ["#packages", "bi-box-seam", "Explore Packages"],
  ["#how-it-works", "bi-signpost-2", "Plan Trips"],
  ["#about", "bi-heart", "Save Experiences"]
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="public-navbar story-navbar">
        <button className="public-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <i className="bi bi-list"></i>
        </button>
        <Link to="/" className="brand">
          <BrandMark />
          <span><strong>Smart Travel Guide</strong><small>Plan Smart, Travel Better</small></span>
        </Link>
        <nav className="desktop-nav story-desktop-nav">
          {menuItems.map(([href,,label]) => <a href={href} key={label}>{label}</a>)}
        </nav>
        <div className="nav-actions">
          <a className="story-nav-login" href="/login?role=user">Login</a>
          <a className="story-nav-signup" href="/signup?role=user">Sign Up</a>
          <ThemeToggle compact />
        </div>
      </header>

      {open && (
        <>
          <div className="public-menu-backdrop" onClick={() => setOpen(false)}></div>
          <aside className="public-left-drawer">
            <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Close menu"><i className="bi bi-x-lg"></i></button>
            <div className="drawer-brand"><BrandMark className="big" /><div><strong>Smart Travel Guide</strong><small>Plan Smart, Travel Better</small></div></div>
            {menuItems.map(([to, icon, label]) => (
              <a href={to} key={`${to}-${label}`} onClick={() => setOpen(false)}><i className={`bi ${icon}`}></i>{label}</a>
            ))}
            <div className="public-drawer-footer">Discover places, packages and simple trip planning in one place.</div>
          </aside>
        </>
      )}
    </>
  );
}

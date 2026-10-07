import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, setLoggedIn, logoutSession, fetchNotifications } from "../utils";
import PlaceCart from "./PlaceCart";
import BrandMark from "./BrandMark";
import ThemeToggle from "./ThemeToggle";

export default function UserNavbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount,setUnreadCount]=useState(0);
  const navigate = useNavigate();
  const user = getUser();
  React.useEffect(()=>{const load=async()=>setUnreadCount((await fetchNotifications()).filter(n=>!n.read).length);load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[]);

  async function logout() { await logoutSession(); setLoggedIn(false); navigate("/"); }

  return (
    <>
      <header className="public-navbar user-navbar">
        <button className="menu-btn nav-menu-left" onClick={() => setOpen(!open)} aria-label="Open menu"><i className="bi bi-list"></i></button>
        <Link to="/user" className="brand">
          <BrandMark />
          <span><strong>Smart <b>Travel</b> Guide</strong><small>Plan Smart, Travel Better</small></span>
        </Link>
        <nav className="desktop-nav">
          <Link to="/user">Home</Link><Link to="/user/search">Search</Link><Link to="/user/packages">Packages</Link><Link to="/user/recommendations">Recommendations</Link>
        </nav>
        <div className="user-nav-right">
          <ThemeToggle compact />
          <button className="icon-btn traveller-nav-notification" onClick={()=>navigate("/user/trips")} title="My Trips notifications"><i className="bi bi-bell-fill"/>{unreadCount>0&&<b>{unreadCount}</b>}</button>
          <PlaceCart />
          <button className="user-chip" onClick={() => setProfileOpen(!profileOpen)}>{user?.avatarData?<img className="avatar avatar-image" src={user.avatarData} alt="Profile"/>:<span className="avatar">{(user?.name || "U").charAt(0)}</span>}<span className="d-none d-md-inline">{user?.name?.split(" ")[0] || "User"}</span><i className="bi bi-chevron-down"></i></button>
        </div>
      </header>

      {profileOpen && <div className="profile-popover"><div className="popover-user">{user?.avatarData?<img className="avatar large avatar-image" src={user.avatarData} alt="Profile"/>:<span className="avatar large">{(user?.name || "U").charAt(0)}</span>}<div><strong>{user?.name}</strong><small>{user?.email}</small></div></div><Link to="/user/profile" onClick={() => setProfileOpen(false)}><i className="bi bi-person"></i> Profile</Link><Link to="/user/trips" onClick={() => setProfileOpen(false)}><i className="bi bi-journal-bookmark"></i> My Trips</Link><Link to="/user/contributions" onClick={() => setProfileOpen(false)}><i className="bi bi-geo-alt"></i> My Contributions</Link><button onClick={logout}><i className="bi bi-box-arrow-right"></i> Logout</button></div>}

      {open && <><div className="menu-backdrop user-menu-backdrop" aria-hidden="true"></div><aside className="user-drawer"><button className="drawer-close" onClick={() => setOpen(false)}><i className="bi bi-x-lg"></i></button><div className="drawer-profile">{user?.avatarData?<img className="avatar large avatar-image" src={user.avatarData} alt="Profile"/>:<span className="avatar large">{(user?.name || "U").charAt(0)}</span>}<div><strong>{user?.name}</strong><small>{user?.email}</small></div></div>{[["/user","bi-house","Home"],["/user/profile","bi-person","My Profile"],["/user/packages","bi-gift","Travel Packages"],["/user/search","bi-search","Search Places"],["/user/trips","bi-calendar3","My Trips"],["/user/recommendations","bi-stars","Recommendations"],["/user/contributions","bi-geo-alt","My Contributions"]].map(([to, icon, label]) => <Link key={to} to={to} className={({isActive}) => isActive ? "drawer-link active" : "drawer-link"}><i className={`bi ${icon}`}></i>{label}</Link>)}<hr /><button className="drawer-logout" onClick={logout}><i className="bi bi-box-arrow-right"></i> Logout</button></aside></>}
    </>
  );
}

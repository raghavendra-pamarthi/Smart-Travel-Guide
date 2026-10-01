import React from "react";
import { Outlet } from "react-router-dom";
import UserNavbar from "../components/UserNavbar";

export default function UserLayout({ children }) {
  return (
    <div className="site-layout user-layout">
      <UserNavbar />
      <div className="site-main-content">
        {children || <Outlet />}
      </div>
    </div>
  );
}

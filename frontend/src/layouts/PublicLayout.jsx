import React from "react";
import { Outlet } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";

export default function PublicLayout({ children }) {
  return (
    <div className="site-layout public-layout">
      <PublicNavbar />
      <div className="site-main-content">
        {children || <Outlet />}
      </div>
    </div>
  );
}

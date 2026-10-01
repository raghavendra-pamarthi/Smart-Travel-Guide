import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import GuideNavbar from "../components/GuideNavbar";

export default function GuideLayout({ children }) {
  const location = useLocation();
  const isDashboardRoot = location.pathname === "/guide";

  return (
    <div className="site-layout guide-layout">
      {!isDashboardRoot && <GuideNavbar />}
      <div className="site-main-content">
        {children || <Outlet />}
      </div>
    </div>
  );
}

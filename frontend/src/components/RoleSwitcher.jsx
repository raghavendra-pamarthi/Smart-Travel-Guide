import React from "react";

export default function RoleSwitcher({ role, onChange }) {
  return (
    <div className="role-switcher" role="tablist" aria-label="Choose account type">
      <button type="button" className={role === "user" ? "active" : ""} onClick={() => onChange("user")} role="tab" aria-selected={role === "user"}>
        <i className="bi bi-person"></i>
        <span>Traveller</span>
      </button>
      <button type="button" className={role === "guide" ? "active" : ""} onClick={() => onChange("guide")} role="tab" aria-selected={role === "guide"}>
        <i className="bi bi-compass"></i>
        <span>Local Guide</span>
      </button>
    </div>
  );
}

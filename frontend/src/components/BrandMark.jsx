import React from "react";

export default function BrandMark({ className = "" }) {
  return (
    <span className={`brand-mark ${className}`} aria-hidden="true">
      <img className="brand-logo-image" src="/assets/stg-logo.jpeg" alt="" />
      <span className="brand-logo-shine" aria-hidden="true" />
    </span>
  );
}

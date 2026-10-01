import React, { useEffect, useState } from "react";

const STORAGE_KEY = "stg_theme";

function readTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-stg-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const sync = (event) => {
      if (event.key === STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const light = theme === "light";
  return (
    <button
      type="button"
      className={`stg-theme-toggle${compact ? " compact" : ""}`}
      onClick={() => setTheme(light ? "dark" : "light")}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
    >
      <i className={`bi ${light ? "bi-moon-stars-fill" : "bi-sun-fill"}`} />
      {!compact && <span>{light ? "Dark" : "Light"}</span>}
    </button>
  );
}

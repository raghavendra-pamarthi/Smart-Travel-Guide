import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";
import "./styles.css";
import "./unified-theme.css";
import App from "./App";

const initialTheme = localStorage.getItem("stg_theme") === "light" ? "light" : "dark";
document.documentElement.setAttribute("data-stg-theme", initialTheme);
document.documentElement.style.colorScheme = initialTheme;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

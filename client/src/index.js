import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./utils/axiosConfig";
import { getCookie, setCookie, setJsonCookie } from "./utils/cookies";

// One-time migration: copy known localStorage keys to cookies.
// Controlled by `REACT_APP_CLEAR_LOCALSTORAGE_AFTER_MIGRATION` (set to 'true' to remove keys).
const MIGRATION_FLAG = "migrated_from_localstorage_v1";
const KEYS_TO_MIGRATE = [
  "access_token",
  "refresh_token",
  "exim_user",
  "superadmin_token",
  "superadmin_user",
  "sso_token",
  "ie_code_no",
  "ie_code_assignments",
  "tab_value",
];

function migrateLocalStorageToCookies() {
  try {
    if (getCookie(MIGRATION_FLAG)) return;
    const clearAfter =
      process.env.REACT_APP_CLEAR_LOCALSTORAGE_AFTER_MIGRATION === "true";

    KEYS_TO_MIGRATE.forEach((key) => {
      try {
        const existingCookie = getCookie(key);
        if (existingCookie) return; // don't overwrite existing cookie

        const lsVal = localStorage.getItem(key);
        if (lsVal === null || lsVal === undefined) return;

        // If value looks like JSON, store as JSON cookie
        try {
          const parsed = JSON.parse(lsVal);
          setJsonCookie(key, parsed, 7);
        } catch (e) {
          setCookie(key, lsVal, 7);
        }

        if (clearAfter) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // Individual key migration failed — continue with others
        // eslint-disable-next-line no-console
        console.warn("Failed migrating key", key, e);
      }
    });

    // Mark migration done for one year
    setCookie(MIGRATION_FLAG, "1", 365);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Migration from localStorage to cookies failed", e);
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
// Run migration before first render
migrateLocalStorageToCookies();

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

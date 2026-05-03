import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------
// On Replit the shared reverse-proxy routes /api/* to the Express server, so
// relative URLs work with no base URL configured.
//
// In production (Vercel), the frontend and API are on different domains.
// Set VITE_API_BASE_URL in your Vercel project to the full URL of your
// deployed API server, e.g.:  https://robins-i-tool-api.onrender.com
//
// When the env var is absent (Replit dev), null is passed and the fetch
// client keeps using relative /api/* URLs through the Replit proxy.
// ---------------------------------------------------------------------------
setBaseUrl(import.meta.env.VITE_API_BASE_URL || null);

createRoot(document.getElementById("root")!).render(<App />);

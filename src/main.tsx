import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "@app/providers";
import { AppRouter } from "@app/router";
import "./i18n";

// Self-hosted Geist (LGPD: avoid third-party requests to fonts.googleapis.com
// that would leak the user's IP to Google on every page load). Includes the
// weights actually used by the design system.
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";

import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>
);

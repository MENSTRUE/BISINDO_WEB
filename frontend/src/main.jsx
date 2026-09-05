import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
} from "react-router-dom";

import {
  RealtimeProvider,
} from "./contexts/RealtimeContext";

import {
  ThemeProvider,
} from "./contexts/ThemeContext";

import App
  from "./App.jsx";

import "./styles/global.css";
import "./styles/theme.css";


createRoot(
  document.getElementById(
    "root"
  ),
).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <RealtimeProvider>
          <App />
        </RealtimeProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
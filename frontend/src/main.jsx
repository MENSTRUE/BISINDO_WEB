import { StrictMode } from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  BrowserRouter,
} from "react-router-dom";

import {
  RealtimeProvider,
} from "./contexts/RealtimeContext";

import App from "./App.jsx";

import "./styles/global.css";


createRoot(
  document.getElementById("root"),
).render(
  <StrictMode>
    <BrowserRouter>
      <RealtimeProvider>
        <App />
      </RealtimeProvider>
    </BrowserRouter>
  </StrictMode>,
);
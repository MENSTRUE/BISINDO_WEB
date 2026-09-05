import {
  Cpu,
  LoaderCircle,
  Moon,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";

import useBackendHealth
  from "../../hooks/useBackendHealth";

import {
  useRealtime,
} from "../../contexts/RealtimeContext";

import {
  useTheme,
} from "../../contexts/ThemeContext";

import "../../styles/header.css";


function Header() {
  /* =========================
     REST BACKEND
  ========================= */

  const {
    health,
    isOnline:
      isBackendOnline,
    isChecking:
      isBackendChecking,
  } = useBackendHealth();


  /* =========================
     WEBSOCKET
  ========================= */

  const {
    status:
      realtimeStatus,

    isConnected:
      isRealtimeConnected,
  } = useRealtime();


  /* =========================
     THEME
  ========================= */

  const {
    theme,
    toggleTheme,
  } = useTheme();


  const isDarkTheme =
    theme === "dark";


  const ThemeIcon =
    isDarkTheme
      ? Sun
      : Moon;


  const themeLabel =
    isDarkTheme
      ? "Dark Mode"
      : "Light Mode";


  const themeButtonTitle =
    isDarkTheme
      ? "Gunakan Light Mode"
      : "Gunakan Dark Mode";


  /* =========================
     UI STATE
  ========================= */

  const getConnectionState =
    () => {
      if (
        isBackendChecking
      ) {
        return "checking";
      }


      if (
        !isBackendOnline
      ) {
        return "offline";
      }


      if (
        isRealtimeConnected
      ) {
        return "online";
      }


      if (
        realtimeStatus ===
        "connecting"
      ) {
        return "checking";
      }


      return "offline";
    };


  const connectionState =
    getConnectionState();


  const ConnectionIcon =
    connectionState ===
    "checking"
      ? LoaderCircle
      : connectionState ===
          "online"
        ? Wifi
        : WifiOff;


  const getConnectionText =
    () => {
      if (
        isBackendChecking
      ) {
        return "Checking...";
      }


      if (
        !isBackendOnline
      ) {
        return "Backend Offline";
      }


      if (
        isRealtimeConnected
      ) {
        return "Realtime Online";
      }


      if (
        realtimeStatus ===
        "connecting"
      ) {
        return (
          "Realtime Connecting"
        );
      }


      return "Realtime Offline";
    };


  return (
    <header className="main-header">
      {/* =========================
          TITLE
      ========================== */}

      <div className="header-title-group">
        <span className="header-eyebrow">
          Workspace
        </span>

        <h1>
          BISINDO Recognition
        </h1>
      </div>


      {/* =========================
          CONTROLS
      ========================== */}

      <div className="header-controls">
        {/* MODEL */}

        <div
          className="header-control-card"
          title="Model pengenalan aktif"
        >
          <span className="header-control-icon">
            <Cpu
              size={16}
              strokeWidth={1.8}
            />
          </span>

          <div className="header-control-content">
            <span className="header-control-label">
              Active Model
            </span>

            <strong>
              v1 · Words
            </strong>
          </div>
        </div>


        {/* CONNECTION */}

        <div
          className={
            `header-control-card connection ${connectionState}`
          }
          title={
            health
              ? (
                  `${health.service} ${health.version}`
                  +
                  ` · WebSocket ${realtimeStatus}`
                )
              : (
                  "Status koneksi backend"
                )
          }
        >
          <span className="header-control-icon">
            <ConnectionIcon
              size={16}
              strokeWidth={1.8}
              className={
                connectionState ===
                "checking"
                  ? (
                      "connection-loading"
                    )
                  : ""
              }
            />
          </span>

          <div className="header-control-content">
            <span className="header-control-label">
              Connection
            </span>

            <strong>
              <span
                className={
                  `connection-dot ${connectionState}`
                }
              />

              {
                getConnectionText()
              }
            </strong>
          </div>
        </div>


        {/* THEME */}

        <button
          type="button"
          className="header-control-card header-theme-toggle"
          title={
            themeButtonTitle
          }
          aria-label={
            themeButtonTitle
          }
          onClick={
            toggleTheme
          }
        >
          <span className="header-control-icon theme-toggle-icon">
            <ThemeIcon
              size={16}
              strokeWidth={1.8}
            />
          </span>

          <div className="header-control-content">
            <span className="header-control-label">
              Appearance
            </span>

            <strong>
              {themeLabel}
            </strong>
          </div>
        </button>
      </div>
    </header>
  );
}


export default Header;
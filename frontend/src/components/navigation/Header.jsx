import {
  Cpu,
  LoaderCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

import useBackendHealth from "../../hooks/useBackendHealth";

import "../../styles/header.css";

function Header() {
  const {
    status,
    health,
    isOnline,
    isChecking,
  } = useBackendHealth();

  const ConnectionIcon =
    isChecking
      ? LoaderCircle
      : isOnline
        ? Wifi
        : WifiOff;

  const getConnectionText = () => {
    if (isChecking) {
      return "Checking...";
    }

    if (isOnline) {
      return "Backend Online";
    }

    return "Backend Offline";
  };

  return (
    <header className="main-header">
      <div className="header-title-group">
        <span className="header-eyebrow">
          Workspace
        </span>

        <h1>
          BISINDO Recognition
        </h1>
      </div>

      <div className="header-controls">
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

        <div
          className={`header-control-card connection ${status}`}
          title={
            health
              ? `${health.service} ${health.version}`
              : "Status koneksi backend"
          }
        >
          <span className="header-control-icon">
            <ConnectionIcon
              size={16}
              strokeWidth={1.8}
              className={
                isChecking
                  ? "connection-loading"
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
                className={`connection-dot ${status}`}
              />

              {getConnectionText()}
            </strong>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
import {
  Cpu,
  Wifi,
} from "lucide-react";

import "../../styles/header.css";

function Header() {
  return (
    <header className="main-header">
      <div className="header-title-group">
        <span className="header-eyebrow">
          Workspace
        </span>

        <h1>BISINDO Recognition</h1>
      </div>

      <div className="header-controls">
        <div
          className="header-control-card"
          title="Active recognition model"
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

            <strong>v1 · Words</strong>
          </div>
        </div>

        <div
          className="header-control-card connection"
          title="Backend connection status"
        >
          <span className="header-control-icon">
            <Wifi
              size={16}
              strokeWidth={1.8}
            />
          </span>

          <div className="header-control-content">
            <span className="header-control-label">
              Connection
            </span>

            <strong>
              <span className="connection-dot" />
              System Ready
            </strong>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
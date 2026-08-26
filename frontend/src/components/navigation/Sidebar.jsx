import { useState } from "react";

import {
  LayoutDashboard,
  ScanLine,
  History,
  BrainCircuit,
  Settings,
  Languages,
} from "lucide-react";

import "../../styles/sidebar.css";

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "recognition",
    label: "Live Recognition",
    icon: ScanLine,
  },
  {
    id: "history",
    label: "History",
    icon: History,
  },
  {
    id: "models",
    label: "Models",
    icon: BrainCircuit,
  },
];

function Sidebar() {
  const [activeItem, setActiveItem] = useState("dashboard");

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Languages size={20} strokeWidth={2} />
        </div>

        <div className="sidebar-brand-text">
          <strong>BISINDO AI</strong>
          <span>Recognition System</span>
        </div>
      </div>

      <div className="sidebar-section">
        <span className="sidebar-section-label">
          Workspace
        </span>

        <nav
          className="sidebar-navigation"
          aria-label="Main navigation"
        >
          {navigationItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              activeItem === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() =>
                  setActiveItem(item.id)
                }
              >
                <span className="sidebar-nav-icon">
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />
                </span>

                <span className="sidebar-nav-label">
                  {item.label}
                </span>

                {isActive && (
                  <span className="sidebar-active-indicator" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-nav-item ${
            activeItem === "settings"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setActiveItem("settings")
          }
        >
          <span className="sidebar-nav-icon">
            <Settings
              size={18}
              strokeWidth={1.8}
            />
          </span>

          <span className="sidebar-nav-label">
            Settings
          </span>

          {activeItem === "settings" && (
            <span className="sidebar-active-indicator" />
          )}
        </button>

        <div className="sidebar-version">
          <span className="sidebar-version-dot" />

          <div>
            <strong>System Online</strong>
            <span>Web v0.1.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
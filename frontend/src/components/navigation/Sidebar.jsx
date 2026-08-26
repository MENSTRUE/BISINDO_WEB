import {
  BrainCircuit,
  History,
  Languages,
  LayoutDashboard,
  ScanLine,
  Settings,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

import "../../styles/sidebar.css";

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "recognition",
    label: "Live Recognition",
    path: "/recognition",
    icon: ScanLine,
  },
  {
    id: "history",
    label: "History",
    path: "/history",
    icon: History,
  },
  {
    id: "models",
    label: "Models",
    path: "/models",
    icon: BrainCircuit,
  },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Languages
            size={20}
            strokeWidth={2}
          />
        </div>

        <div className="sidebar-brand-text">
          <strong>BISINDO AI</strong>
          <span>
            Recognition System
          </span>
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
          {navigationItems.map(
            (item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({
                    isActive,
                  }) =>
                    `sidebar-nav-item ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
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
                    </>
                  )}
                </NavLink>
              );
            },
          )}
        </nav>
      </div>

      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-nav-item ${
              isActive
                ? "active"
                : ""
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="sidebar-nav-icon">
                <Settings
                  size={18}
                  strokeWidth={1.8}
                />
              </span>

              <span className="sidebar-nav-label">
                Settings
              </span>

              {isActive && (
                <span className="sidebar-active-indicator" />
              )}
            </>
          )}
        </NavLink>

        <div className="sidebar-version">
          <span className="sidebar-version-dot" />

          <div>
            <strong>
              System Online
            </strong>

            <span>
              Web v0.1.0
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
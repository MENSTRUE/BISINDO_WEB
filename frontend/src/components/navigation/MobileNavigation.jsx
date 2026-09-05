import {
  BookOpen,
  BrainCircuit,
  History,
  LayoutDashboard,
  ScanLine,
  Settings,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";


const navigationItems = [
  {
    id: "dashboard",
    label: "Home",
    path: "/dashboard",
    icon: LayoutDashboard,
  },

  {
    id: "recognition",
    label: "Live",
    path: "/recognition",
    icon: ScanLine,
  },

  {
    id: "learning",
    label: "Belajar",
    path: "/learning",
    icon: BookOpen,
  },

  {
    id: "history",
    label: "Riwayat",
    path: "/history",
    icon: History,
  },

  {
    id: "models",
    label: "Model",
    path: "/models",
    icon: BrainCircuit,
  },

  {
    id: "settings",
    label: "Setelan",
    path: "/settings",
    icon: Settings,
  },
];


function MobileNavigation() {
  return (
    <nav
      className="mobile-navigation"
      aria-label="Mobile navigation"
    >
      <div className="mobile-navigation-inner">
        {navigationItems.map(
          (item) => {
            const Icon =
              item.icon;


            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({
                  isActive,
                }) =>
                  `mobile-nav-item ${
                    isActive
                      ? "active"
                      : ""
                  }`
                }
              >
                {({
                  isActive,
                }) => (
                  <>
                    <span className="mobile-nav-icon">
                      <Icon
                        size={19}
                        strokeWidth={
                          isActive
                            ? 2
                            : 1.7
                        }
                      />
                    </span>

                    <span className="mobile-nav-label">
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="mobile-nav-indicator" />
                    )}
                  </>
                )}
              </NavLink>
            );
          }
        )}
      </div>
    </nav>
  );
}


export default MobileNavigation;
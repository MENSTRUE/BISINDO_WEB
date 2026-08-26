import Sidebar from "../components/navigation/Sidebar";

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar />
      </div>

      <div className="app-workspace">
        <header className="app-header">
          <div>
            <span className="header-eyebrow">
              Workspace
            </span>

            <h1>BISINDO Recognition</h1>
          </div>

          <div className="system-indicator">
            <span className="indicator-dot" />

            System Ready
          </div>
        </header>

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
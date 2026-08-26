function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-placeholder">
          <span className="brand-mark">BI</span>

          <div>
            <strong>BISINDO AI</strong>
            <small>Recognition System</small>
          </div>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <div>
            <span className="header-eyebrow">Workspace</span>
            <h1>BISINDO Recognition</h1>
          </div>

          <div className="system-indicator">
            <span className="indicator-dot" />
            System Ready
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
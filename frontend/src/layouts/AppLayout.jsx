import Sidebar
  from "../components/navigation/Sidebar";

import Header
  from "../components/navigation/Header";

import MobileNavigation
  from "../components/navigation/MobileNavigation";


function AppLayout({
  children,
}) {
  return (
    <div className="app-layout">
      {/* =========================
          DESKTOP / TABLET SIDEBAR
      ========================== */}

      <div className="app-sidebar">
        <Sidebar />
      </div>


      {/* =========================
          WORKSPACE
      ========================== */}

      <div className="app-workspace">
        <Header />

        <main className="app-content">
          {children}
        </main>
      </div>


      {/* =========================
          MOBILE NAVIGATION
      ========================== */}

      <MobileNavigation />
    </div>
  );
}


export default AppLayout;
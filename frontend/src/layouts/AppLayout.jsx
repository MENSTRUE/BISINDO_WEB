import Sidebar from "../components/navigation/Sidebar";
import Header from "../components/navigation/Header";

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar />
      </div>

      <div className="app-workspace">
        <Header />

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
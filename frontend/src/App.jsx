import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppLayout from "./layouts/AppLayout";

import DashboardPage from "./pages/DashboardPage";
import RecognitionPage from "./pages/RecognitionPage";
import HistoryPage from "./pages/HistoryPage";
import ModelsPage from "./pages/ModelsPage";
import SettingsPage from "./pages/SettingsPage";

import "./styles/layout.css";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/recognition"
          element={<RecognitionPage />}
        />

        <Route
          path="/history"
          element={<HistoryPage />}
        />

        <Route
          path="/models"
          element={<ModelsPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </AppLayout>
  );
}

export default App;
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import Captures from "./pages/Captures.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Docs from "./pages/Docs.jsx";
import DocsSelector from "./pages/DocsSelector.jsx";
import EventRadar from "./pages/EventRadar.jsx";
import JoinTeam from "./pages/JoinTeam.jsx";
import Login from "./pages/Login.jsx";
import OnboardingDocs from "./pages/OnboardingDocs.jsx";
import Playbook from "./pages/Playbook.jsx";
import Register from "./pages/Register.jsx";
import Report from "./pages/Report.jsx";
import Settings from "./pages/Settings.jsx";
import { useAuth } from "./lib/auth.jsx";

function RequireAuth({ children }) {
  const { ready, authRequired, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!ready) {
    return null;
  }
  if (authRequired && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/join" element={<JoinTeam />} />
      <Route path="/docs" element={<DocsSelector standalone />} />
      <Route path="/docs/guide" element={<Docs standalone />} />
      <Route path="/docs/onboarding" element={<OnboardingDocs standalone />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Captures />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="events" element={<EventRadar />} />
        <Route path="playbook" element={<Playbook />} />
        <Route path="docs" element={<DocsSelector />} />
        <Route path="docs/guide" element={<Docs />} />
        <Route path="docs/onboarding" element={<OnboardingDocs />} />
        <Route path="captures/:captureId" element={<Report />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

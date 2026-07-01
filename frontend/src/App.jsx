import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import Captures from "./pages/Captures.jsx";
import EventRadar from "./pages/EventRadar.jsx";
import Report from "./pages/Report.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Captures />} />
        <Route path="events" element={<EventRadar />} />
        <Route path="captures/:captureId" element={<Report />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

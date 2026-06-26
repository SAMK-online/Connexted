import { NavLink, Route, Routes } from "react-router-dom";
import Captures from "./pages/Captures.jsx";
import EventRadar from "./pages/EventRadar.jsx";
import Report from "./pages/Report.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-panel">
          <div className="brand-mark">C</div>
          <div>
            <p className="eyebrow">CONNEXTed</p>
            <h1>GTM Agent Desk</h1>
          </div>
        </div>
        <nav>
          <NavLink to="/">Captures</NavLink>
          <NavLink to="/events">Event Radar</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </aside>
      <main className="content">
        <div className="topbar">
          <span>WhatsApp-first GTM intelligence</span>
          <span className="topbar-dot" />
          <span>Human-reviewed outreach</span>
        </div>
        <Routes>
          <Route path="/" element={<Captures />} />
          <Route path="/events" element={<EventRadar />} />
          <Route path="/captures/:captureId" element={<Report />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

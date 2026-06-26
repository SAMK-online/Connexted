export default function Settings() {
  return (
    <section className="stack">
      <header className="page-header hero-card">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Playbooks, style profiles, and integrations</h2>
          <p className="page-subtitle">
            Configure the rules that keep agent recommendations aligned with your GTM motion.
          </p>
        </div>
      </header>
      <div className="card">
        <h3>Default GTM controls</h3>
        <p>
          Admin configuration will manage ICP, personas, value props, banned phrases,
          source policy, retention policy, and HubSpot connections.
        </p>
      </div>
    </section>
  );
}

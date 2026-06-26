import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discoverEvents, listEvents } from "../lib/api.js";

export default function EventRadar() {
  const queryClient = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: listEvents });
  const discovery = useMutation({
    mutationFn: discoverEvents,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] })
  });

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    discovery.mutate({
      organization_id: "demo-org",
      rep_id: "demo-rep",
      industry: form.get("industry"),
      region: form.get("region") || null,
      date_start: form.get("date_start") || null,
      date_end: form.get("date_end") || null,
      personas: splitList(form.get("personas")),
      verticals: splitList(form.get("verticals")),
      keywords: splitList(form.get("keywords")),
      max_events: Number(form.get("max_events") || 5)
    });
  }

  return (
    <section className="stack">
      <header className="page-header hero-card">
        <div>
          <p className="eyebrow">Prospecting</p>
          <h2>Event Radar</h2>
          <p className="page-subtitle">
            Find relevant events and public prospects before your team arrives.
          </p>
        </div>
        <span className="badge">2–3 public prospects per event</span>
      </header>

      <form className="card form-grid" onSubmit={submit}>
        <label>
          Industry
          <input name="industry" required placeholder="Cybersecurity, fintech, healthcare AI..." />
        </label>
        <label>
          Region
          <input name="region" placeholder="New York, Bay Area, North America, remote" />
        </label>
        <label>
          Start date
          <input type="date" name="date_start" />
        </label>
        <label>
          End date
          <input type="date" name="date_end" />
        </label>
        <label>
          Personas
          <input name="personas" placeholder="VP Sales, Partnerships, RevOps" />
        </label>
        <label>
          Verticals
          <input name="verticals" placeholder="B2B SaaS, enterprise, channel" />
        </label>
        <label>
          Keywords
          <input name="keywords" placeholder="partner ecosystem, expansion, AI" />
        </label>
        <label>
          Max events
          <input type="number" name="max_events" min="1" max="10" defaultValue="5" />
        </label>
        <button disabled={discovery.isPending}>
          {discovery.isPending ? "Finding events..." : "Find relevant events"}
        </button>
      </form>

      {discovery.data?.warnings?.map((warning) => (
        <p className="warning" key={warning}>{warning}</p>
      ))}

      <div className="stack">
        {events.isLoading ? <div className="card muted-card">Loading event recommendations...</div> : null}
        {!events.isLoading && !(events.data || []).length ? (
          <div className="card muted-card">No event recommendations yet. Run a discovery search to start.</div>
        ) : null}
        {(events.data || []).map((event) => (
          <article className="card stack" key={event.id}>
            <div className="page-header">
              <div>
                <p className="eyebrow">{event.event_type}</p>
                <h3>{event.name}</h3>
                <p>{event.location || "Location pending"}</p>
              </div>
              <span className={`badge ${event.confidence}`}>{event.confidence} confidence</span>
            </div>
            <p>{event.relevance_summary}</p>
            <div className="pill-list">
              {event.fit_reasons.map((reason) => (
                <span className="pill" key={reason}>{reason}</span>
              ))}
            </div>
            <section>
              <h4>Recommended public attendees</h4>
              <div className="grid">
                {event.attendees.map((attendee) => (
                  <div className="attendee-card" key={attendee.id}>
                    <div className="draft-header">
                      <strong>{attendee.name}</strong>
                      <span className="badge inferred">{attendee.attendee_role}</span>
                    </div>
                    <p>{attendee.title} · {attendee.company}</p>
                    <p>{attendee.relevance_reason}</p>
                    <p><strong>Angle:</strong> {attendee.suggested_angle}</p>
                    {attendee.inferred ? <p className="warning">Public-role inference. Verify before using.</p> : null}
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h4>Pre-event draft angles</h4>
              {event.drafts.map((draft) => (
                <div className="draft compact" key={draft.id}>
                  {draft.subject ? <p><strong>{draft.subject}</strong></p> : null}
                  <pre>{draft.body}</pre>
                </div>
              ))}
            </section>
          </article>
        ))}
      </div>
    </section>
  );
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

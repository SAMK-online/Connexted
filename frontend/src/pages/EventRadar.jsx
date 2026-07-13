import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radar, MapPin, AlertTriangle, Users } from "lucide-react";
import { discoverEvents, listEvents } from "../lib/api.js";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CONFIDENCE_STYLES = {
  high: "border-transparent bg-signal text-signal-foreground",
  medium: "border-border text-foreground",
  low: "border-border text-muted-foreground"
};

function ConfidenceBadge({ level }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider",
        CONFIDENCE_STYLES[level] || "border-border text-muted-foreground"
      )}
    >
      {level} confidence
    </span>
  );
}

const FIELDS = [
  { name: "industry", label: "Industry", placeholder: "Cybersecurity, fintech, healthcare AI…", required: true },
  { name: "region", label: "Region", placeholder: "New York, Bay Area, remote" },
  { name: "date_start", label: "Start date", type: "date" },
  { name: "date_end", label: "End date", type: "date" },
  { name: "personas", label: "Personas", placeholder: "VP Sales, Partnerships, RevOps" },
  { name: "verticals", label: "Verticals", placeholder: "B2B SaaS, enterprise, channel" },
  { name: "keywords", label: "Keywords", placeholder: "partner ecosystem, expansion, AI" },
  { name: "max_events", label: "Max events", type: "number", min: "1", max: "10", defaultValue: "5" }
];

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

  const list = events.data || [];

  return (
    <section>
      <PageHeader
        eyebrow="Prospecting"
        title="Event Radar"
        subtitle="Find relevant events and public prospects before your team arrives."
        action={<Badge variant="outline">2–3 public prospects per event</Badge>}
      />

      <form
        onSubmit={submit}
        className="mb-8 rounded-lg border border-border bg-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type || "text"}
                min={field.min}
                max={field.max}
                required={field.required}
                defaultValue={field.defaultValue}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
        <Button type="submit" disabled={discovery.isPending} className="mt-5">
          <Radar className="h-4 w-4" />
          {discovery.isPending ? "Finding events…" : "Find relevant events"}
        </Button>
      </form>

      {discovery.data?.warnings?.length ? (
        <div className="mb-8 flex flex-col gap-2">
          {discovery.data.warnings.map((warning) => (
            <p
              key={warning}
              className="flex items-start gap-2 rounded-md border-l-2 border-foreground bg-secondary/50 px-3 py-2 text-sm text-foreground/80"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        {events.isLoading ? (
          <EmptyRow>Loading event recommendations…</EmptyRow>
        ) : null}
        {!events.isLoading && !list.length ? (
          <EmptyRow>No event recommendations yet. Run a discovery search to start.</EmptyRow>
        ) : null}

        {list.map((event) => (
          <article key={event.id} className="rounded-lg border border-border bg-card">
            <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {event.event_type.replace(/_/g, " ")}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                  {event.name}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location || "Location pending"}
                </p>
              </div>
              <ConfidenceBadge level={event.confidence} />
            </div>

            <div className="p-6">
              <p className="text-foreground/80">{event.relevance_summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {event.fit_reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    {reason}
                  </span>
                ))}
              </div>

              <div className="mt-8">
                <h4 className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Recommended public attendees
                </h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {event.attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm">{attendee.name}</strong>
                        <Badge variant="muted">{attendee.attendee_role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {attendee.title} · {attendee.company}
                      </p>
                      <p className="text-xs text-foreground/70">{attendee.relevance_reason}</p>
                      <p className="text-xs">
                        <span className="font-semibold">Angle: </span>
                        {attendee.suggested_angle}
                      </p>
                      {attendee.inferred ? (
                        <p className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                          <AlertTriangle className="h-3 w-3" />
                          Public-role inference. Verify before using.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <h4 className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Pre-event draft angles
                </h4>
                <div className="mt-4 flex flex-col gap-3">
                  {event.drafts.map((draft) => (
                    <div key={draft.id} className="rounded-lg border border-border p-4">
                      {draft.subject ? (
                        <p className="mb-2 text-sm font-semibold">{draft.subject}</p>
                      ) : null}
                      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                        {draft.body}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyRow({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

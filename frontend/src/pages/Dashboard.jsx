import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  Inbox,
  Search,
  UserRound,
  UsersRound
} from "lucide-react";
import { listCaptures } from "../lib/api.js";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  queued: "border-border text-muted-foreground",
  running: "border-border text-foreground",
  review_ready: "border-transparent bg-foreground text-background",
  needs_input: "border-border text-foreground",
  failed: "border-destructive/40 text-destructive"
};

export default function Dashboard() {
  const captures = useQuery({ queryKey: ["captures"], queryFn: listCaptures });
  const [query, setQuery] = useState("");
  const list = captures.data || [];
  const folders = useMemo(() => groupByEvent(list, query), [list, query]);
  const stats = useMemo(() => buildStats(list), [list]);

  return (
    <section>
      <PageHeader
        eyebrow="Event dashboard"
        title="Event folders"
        subtitle="See every person met at an event, grouped by the event folder they came from."
        action={<Badge variant="outline">{stats.people} people captured</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={FolderOpen} label="Events" value={stats.events} />
        <StatCard icon={UsersRound} label="People" value={stats.people} />
        <StatCard icon={Building2} label="Companies" value={stats.companies} />
        <StatCard icon={Inbox} label="Review ready" value={stats.reviewReady} />
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            placeholder="Search event, person, company, or notes"
          />
        </div>
        <Button asChild variant="outline">
          <Link to="/app">Add capture</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-5">
        {captures.isLoading ? <EmptyState>Loading event folders...</EmptyState> : null}
        {!captures.isLoading && !folders.length ? (
          <EmptyState>No event folders yet. Add captures with an event name to build the dashboard.</EmptyState>
        ) : null}
        {folders.map((folder) => (
          <Card key={folder.key}>
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-secondary/50">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate">{folder.name}</CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{folder.people.length} people</span>
                    <span>{folder.companyCount} companies</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(folder.latest)}
                    </span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge variant="muted">{folder.reviewReady} review ready</Badge>
                <Badge variant="outline">{folder.openCount} open</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="mb-2 rounded-lg border border-border bg-secondary/25 p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <h3 className="font-display text-base font-semibold tracking-tight">
                    Folder prep
                  </h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{folder.prep.objective}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <PrepColumn title="Cover" items={folder.prep.cover} />
                  <PrepColumn title="Ask" items={folder.prep.ask} />
                  <PrepColumn title="Prioritize" items={folder.prep.prioritize} />
                </div>
              </div>
              {folder.people.map((capture) => (
                <Link
                  key={capture.id}
                  to={`/app/captures/${capture.id}`}
                  className="group grid gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:border-foreground/30 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {capture.prospect_name || "Unknown prospect"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {capture.company_name || "Company pending"}
                      </p>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {capture.notes || capture.raw_text || "No conversation notes captured yet."}
                  </p>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge status={capture.status} />
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-md border border-border bg-secondary/50">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider",
        STATUS_STYLES[status] || "border-border text-muted-foreground"
      )}
    >
      {String(status || "").replace(/_/g, " ")}
    </span>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function groupByEvent(captures, query) {
  const normalizedQuery = query.trim().toLowerCase();
  const map = new Map();
  for (const capture of captures) {
    if (normalizedQuery && !captureMatches(capture, normalizedQuery)) {
      continue;
    }
    const name = normalizeEventName(capture.event_name);
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { key, name, people: [] });
    }
    map.get(key).people.push(capture);
  }
  return [...map.values()]
    .map((folder) => {
      const companies = new Set(
        folder.people.map((capture) => capture.company_name).filter(Boolean)
      );
      const latest = folder.people.reduce((current, capture) => {
        const created = new Date(capture.created_at).getTime();
        return Math.max(current, Number.isFinite(created) ? created : 0);
      }, 0);
      return {
        ...folder,
        companyCount: companies.size,
        latest,
        prep: buildFolderPrep(folder.name, folder.people, companies),
        reviewReady: folder.people.filter((capture) => capture.status === "review_ready").length,
        openCount: folder.people.filter((capture) => capture.status !== "review_ready").length
      };
    })
    .sort((a, b) => b.latest - a.latest);
}

function PrepColumn({ title, items }) {
  return (
    <div>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildStats(captures) {
  const eventNames = new Set(captures.map((capture) => normalizeEventName(capture.event_name)));
  const companies = new Set(captures.map((capture) => capture.company_name).filter(Boolean));
  return {
    events: eventNames.size,
    people: captures.length,
    companies: companies.size,
    reviewReady: captures.filter((capture) => capture.status === "review_ready").length
  };
}

function buildFolderPrep(name, people, companies) {
  const reviewReady = people.filter((capture) => capture.status === "review_ready").length;
  const open = people.length - reviewReady;
  const companyList = [...companies].slice(0, 3);
  const priorityPeople = people
    .filter((capture) => capture.status === "review_ready")
    .concat(people.filter((capture) => capture.status !== "review_ready"))
    .slice(0, 3)
    .map((capture) => capture.prospect_name || capture.company_name || "Unknown prospect");

  return {
    objective: `Prepare for ${name} with ${people.length} captured ${
      people.length === 1 ? "person" : "people"
    }, ${reviewReady} review-ready follow-up${open ? `, and ${open} still open` : ""}.`,
    cover: [
      "Start with the event context before product value.",
      "Cluster similar company pains before writing follow-up.",
      "Use approved reports as the source of truth."
    ],
    ask: [
      "What was the strongest signal from this event?",
      "Who needs a same-week follow-up?",
      "Which conversations need more research before outreach?"
    ],
    prioritize: priorityPeople.length ? priorityPeople : companyList.length ? companyList : ["No people yet"]
  };
}

function captureMatches(capture, query) {
  return [
    capture.event_name,
    capture.prospect_name,
    capture.company_name,
    capture.notes,
    capture.raw_text
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function normalizeEventName(name) {
  const value = String(name || "").trim();
  return value || "Unassigned event";
}

function formatDate(timestamp) {
  if (!timestamp) return "No activity";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(timestamp));
}

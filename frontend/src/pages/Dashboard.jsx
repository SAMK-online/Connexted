import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FolderOpen,
  Globe2,
  Inbox,
  Plus,
  Radio,
  RefreshCw,
  Search,
  UserRound,
  UsersRound
} from "lucide-react";
import {
  convertEventSiteVisitor,
  convertSocialCandidate,
  deepDiveEventSite,
  listEventSiteVisitors,
  discoverSocialIntent,
  listCaptures,
  listSocialCandidates
} from "../lib/api.js";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumberTicker } from "@/components/fx/NumberTicker";
import { SpotlightCard } from "@/components/fx/SpotlightCard";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  queued: "border-border text-muted-foreground",
  running: "border-signal/50 text-foreground",
  review_ready: "border-transparent bg-signal text-signal-foreground",
  needs_input: "border-border text-foreground",
  failed: "border-destructive/40 text-destructive"
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const captures = useQuery({ queryKey: ["captures"], queryFn: listCaptures });
  const socialCandidates = useQuery({
    queryKey: ["social-candidates"],
    queryFn: () => listSocialCandidates()
  });
  const eventSiteVisitors = useQuery({
    queryKey: ["event-site-visitors"],
    queryFn: () => listEventSiteVisitors()
  });
  const [query, setQuery] = useState("");
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const list = captures.data || [];
  const socialList = socialCandidates.data || [];
  const siteVisitorList = eventSiteVisitors.data || [];
  const dashboardDeepDive = useMutation({
    mutationFn: deepDiveEventSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-site-visitors"] });
      setIsDeepDiveOpen(false);
    }
  });
  const folders = useMemo(
    () => groupByEvent(list, query, socialList, siteVisitorList),
    [list, query, socialList, siteVisitorList]
  );
  const candidatesByEvent = useMemo(() => groupSocialCandidates(socialList), [socialList]);
  const visitorsByEvent = useMemo(() => groupEventSiteVisitors(siteVisitorList), [siteVisitorList]);
  const stats = useMemo(
    () => buildStats(list, socialList, siteVisitorList),
    [list, socialList, siteVisitorList]
  );

  function submitDashboardDeepDive(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    dashboardDeepDive.mutate({
      organization_id: "demo-org",
      rep_id: "demo-rep",
      event_name: String(form.get("event_name") || "").trim(),
      event_url: String(form.get("event_url") || "").trim() || null,
      site_text: String(form.get("site_text") || ""),
      roles: ["speaker", "sponsor", "exhibitor", "organizer", "attendee"],
      max_visitors: 25
    });
  }

  return (
    <section>
      <PageHeader
        eyebrow="Event dashboard"
        title="Event folders"
        subtitle="See every person met at an event, grouped by the event folder they came from."
        action={
          <Badge variant="outline">
            {stats.people} captured · {stats.confirmed} confirmed · {stats.prospects} prospects
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-6">
        <StatCard icon={FolderOpen} label="Events" value={stats.events} />
        <StatCard icon={UsersRound} label="People" value={stats.people} />
        <StatCard icon={Building2} label="Companies" value={stats.companies} />
        <StatCard icon={CheckCircle2} label="Confirmed" value={stats.confirmed} />
        <StatCard icon={Radio} label="Prospects" value={stats.prospects} />
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeepDiveOpen((value) => !value)}
          >
            <Globe2 className="h-4 w-4" />
            Event deep dive
          </Button>
          <Button asChild variant="outline">
            <Link to="/app">
              <Plus className="h-4 w-4" />
              Add capture
            </Link>
          </Button>
        </div>
      </div>

      {isDeepDiveOpen ? (
        <form
          onSubmit={submitDashboardDeepDive}
          className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Event name" htmlFor="dashboard-event-name">
              <Input id="dashboard-event-name" name="event_name" required placeholder="SaaStr Annual" />
            </Field>
            <Field label="Event site URL" htmlFor="dashboard-event-url">
              <Input
                id="dashboard-event-url"
                name="event_url"
                placeholder="https://event.com/speakers"
              />
            </Field>
          </div>
          <Field label="Public event-site text" htmlFor="dashboard-event-site-text">
            <Textarea
              id="dashboard-event-site-text"
              name="site_text"
              required
              placeholder="Paste speakers, sponsors, exhibitors, organizers, or attendee sections."
            />
          </Field>
          {dashboardDeepDive.isError ? (
            <p className="text-sm text-destructive">{dashboardDeepDive.error.message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={dashboardDeepDive.isPending}>
              {dashboardDeepDive.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save confirmed visitors
                </>
              )}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 grid gap-5">
        {captures.isLoading ? <EmptyState>Loading event folders...</EmptyState> : null}
        {!captures.isLoading && !eventSiteVisitors.isLoading && !folders.length ? (
          <EmptyState>No event folders yet. Add captures with an event name to build the dashboard.</EmptyState>
        ) : null}
        {folders.map((folder) => {
          const confirmedVisitors = visitorsByEvent.get(folder.key) || [];
          const socialSignals = candidatesByEvent.get(folder.key) || [];
          return (
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
                  <Badge variant="outline">{confirmedVisitors.length} confirmed</Badge>
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
                <ConfirmedVisitorsPanel
                  folder={folder}
                  visitors={confirmedVisitors}
                  isLoading={eventSiteVisitors.isLoading}
                  queryClient={queryClient}
                />
                <SocialIntentPanel
                  folder={folder}
                  candidates={socialSignals}
                  isLoading={socialCandidates.isLoading}
                  queryClient={queryClient}
                />
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
          );
        })}
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="group overflow-hidden transition-colors hover:border-foreground/30">
      <SpotlightCard>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
              <NumberTicker value={value} />
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-md border border-border bg-secondary/50 transition-colors group-hover:border-signal/50">
            <Icon className="h-5 w-5 transition-colors group-hover:text-signal" />
          </div>
        </CardContent>
      </SpotlightCard>
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

function ConfirmedVisitorsPanel({ folder, visitors, isLoading, queryClient }) {
  const [isOpen, setIsOpen] = useState(false);
  const fieldPrefix = `${folder.key}-site`.replace(/[^a-z0-9_-]/g, "-");
  const deepDive = useMutation({
    mutationFn: deepDiveEventSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-site-visitors"] });
    }
  });
  const convert = useMutation({
    mutationFn: (visitorId) => convertEventSiteVisitor(visitorId, { rep_id: "demo-rep" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["captures"] });
      queryClient.invalidateQueries({ queryKey: ["event-site-visitors"] });
    }
  });

  function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    deepDive.mutate({
      organization_id: "demo-org",
      rep_id: "demo-rep",
      event_name: folder.name,
      event_url: String(form.get("event_url") || "").trim() || null,
      site_text: String(form.get("site_text") || ""),
      roles: ["speaker", "sponsor", "exhibitor", "organizer", "attendee"],
      max_visitors: 25
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tracking-tight">
              Confirmed visitors
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {visitors.length
                ? `${visitors.length} event-site listings saved`
                : "Analyze public event-site listings"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? "Close deep dive" : "Analyze site"}
        </Button>
      </div>

      {isOpen ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <Field label="Event site URL" htmlFor={`${fieldPrefix}-url`}>
            <Input
              id={`${fieldPrefix}-url`}
              name="event_url"
              placeholder="https://event.com/speakers"
            />
          </Field>
          <Field label="Public event-site text" htmlFor={`${fieldPrefix}-site-text`}>
            <Textarea
              id={`${fieldPrefix}-site-text`}
              name="site_text"
              placeholder="Paste speakers, sponsors, exhibitors, organizers, or attendee sections."
            />
          </Field>
          {deepDive.isError ? (
            <p className="text-sm text-destructive">{deepDive.error.message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={deepDive.isPending}>
              {deepDive.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  <Globe2 className="h-4 w-4" />
                  Analyze site
                </>
              )}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 grid gap-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading confirmed visitors...</p>
        ) : null}
        {!isLoading && !visitors.length ? (
          <p className="text-sm text-muted-foreground">
            No confirmed event-site visitors saved for this event yet.
          </p>
        ) : null}
        {visitors.map((visitor) => (
          <EventSiteVisitorRow
            key={visitor.id}
            visitor={visitor}
            isConverting={convert.isPending && convert.variables === visitor.id}
            onConvert={() => convert.mutate(visitor.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SocialIntentPanel({ folder, candidates, isLoading, queryClient }) {
  const [isOpen, setIsOpen] = useState(false);
  const fieldPrefix = folder.key.replace(/[^a-z0-9_-]/g, "-");
  const discover = useMutation({
    mutationFn: discoverSocialIntent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-candidates"] });
    }
  });
  const convert = useMutation({
    mutationFn: (candidateId) => convertSocialCandidate(candidateId, { rep_id: "demo-rep" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["captures"] });
      queryClient.invalidateQueries({ queryKey: ["social-candidates"] });
    }
  });

  function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    discover.mutate({
      organization_id: "demo-org",
      rep_id: "demo-rep",
      event_name: folder.name,
      platforms: ["manual_import"],
      post_links: splitList(form.get("post_links")),
      hashtags: splitList(form.get("hashtags")),
      keywords: splitList(form.get("keywords")),
      organizer_handles: [],
      sponsor_names: [],
      pasted_posts: String(form.get("pasted_posts") || ""),
      max_posts: 10
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary">
            <Radio className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tracking-tight">
              Prospective visitors
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {candidates.length
                ? `${candidates.length} public social signals saved`
                : "Find public posts tied to this event"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? "Close import" : "Import links"}
        </Button>
      </div>

      {isOpen ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <Field label="Public post links" htmlFor={`${fieldPrefix}-links`}>
            <Textarea
              id={`${fieldPrefix}-links`}
              name="post_links"
              placeholder="https://www.linkedin.com/posts/..."
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Hashtags" htmlFor={`${fieldPrefix}-hashtags`}>
              <Input
                id={`${fieldPrefix}-hashtags`}
                name="hashtags"
                placeholder="#SaaStrAnnual, #RevOps"
              />
            </Field>
            <Field label="Keywords" htmlFor={`${fieldPrefix}-keywords`}>
              <Input
                id={`${fieldPrefix}-keywords`}
                name="keywords"
                placeholder="attending, dinner, partnerships"
              />
            </Field>
          </div>
          <Field label="Optional post text or context" htmlFor={`${fieldPrefix}-posts`}>
            <Textarea
              id={`${fieldPrefix}-posts`}
              name="pasted_posts"
              placeholder="Visible post text, speaker notes, or meeting intent from the source post."
            />
          </Field>
          {discover.isError ? (
            <p className="text-sm text-destructive">{discover.error.message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={discover.isPending}>
              {discover.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importing
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Import links
                </>
              )}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 grid gap-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading social prospects...</p> : null}
        {!isLoading && !candidates.length ? (
          <p className="text-sm text-muted-foreground">
            No prospective visitors saved for this event yet.
          </p>
        ) : null}
        {candidates.map((candidate) => (
          <CandidateRow
            key={candidate.id}
            candidate={candidate}
            isConverting={convert.isPending && convert.variables === candidate.id}
            onConvert={() => convert.mutate(candidate.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function EventSiteVisitorRow({ visitor, isConverting, onConvert }) {
  const converted = visitor.status === "converted" && visitor.converted_capture_id;
  const evidence = visitor.evidence?.[0]?.replace("Public event site line: ", "");
  return (
    <div className="grid gap-3 rounded-md border border-border bg-secondary/20 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{visitor.name || "Confirmed visitor"}</p>
          <Badge variant="outline">{formatLabel(visitor.visitor_role)}</Badge>
          <Badge variant={visitor.confidence === "high" ? "default" : "muted"}>
            {visitor.confidence}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[visitor.title, visitor.company].filter(Boolean).join(", ") || visitor.source_label}
        </p>
        {evidence ? <p className="mt-2 line-clamp-2 text-sm">{evidence}</p> : null}
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {visitor.suggested_angle}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 md:justify-end">
        {visitor.source_url ? (
          <Button asChild variant="ghost" size="icon" aria-label="Open event source">
            <a href={visitor.source_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
        {converted ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/app/captures/${visitor.converted_capture_id}`}>Open capture</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onConvert} disabled={isConverting}>
            {isConverting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Converting
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Convert
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function CandidateRow({ candidate, isConverting, onConvert }) {
  const converted = candidate.status === "converted" && candidate.converted_capture_id;
  return (
    <div className="grid gap-3 rounded-md border border-border bg-secondary/20 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">
            {candidate.author_name || candidate.author_handle || "Public social lead"}
          </p>
          <Badge variant="outline">{formatLabel(candidate.classification)}</Badge>
          <Badge variant={candidate.confidence === "high" ? "default" : "muted"}>
            {candidate.confidence}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {[candidate.author_title, candidate.author_company].filter(Boolean).join(", ") ||
            candidate.platform}
        </p>
        <p className="mt-2 line-clamp-2 text-sm">{candidate.post_text}</p>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {candidate.suggested_angle}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 md:justify-end">
        {candidate.post_url ? (
          <Button asChild variant="ghost" size="icon" aria-label="Open source post">
            <a href={candidate.post_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
        {converted ? (
          <Button asChild variant="outline" size="sm">
            <Link to={`/app/captures/${candidate.converted_capture_id}`}>Open capture</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onConvert} disabled={isConverting}>
            {isConverting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Converting
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Convert
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function groupByEvent(captures, query, socialCandidates = [], siteVisitors = []) {
  const normalizedQuery = query.trim().toLowerCase();
  const map = new Map();
  function ensureFolder(name) {
    const normalizedName = normalizeEventName(name);
    const key = normalizedName.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { key, name: normalizedName, people: [], signalCompanies: [], signalDates: [] });
    }
    return map.get(key);
  }

  for (const capture of captures) {
    if (normalizedQuery && !captureMatches(capture, normalizedQuery)) {
      continue;
    }
    ensureFolder(capture.event_name).people.push(capture);
  }
  for (const candidate of socialCandidates) {
    if (normalizedQuery && !socialCandidateMatches(candidate, normalizedQuery)) {
      continue;
    }
    const folder = ensureFolder(candidate.event_name);
    folder.signalCompanies.push(candidate.author_company);
    folder.signalDates.push(candidate.created_at);
  }
  for (const visitor of siteVisitors) {
    if (normalizedQuery && !eventSiteVisitorMatches(visitor, normalizedQuery)) {
      continue;
    }
    const folder = ensureFolder(visitor.event_name);
    folder.signalCompanies.push(visitor.company);
    folder.signalDates.push(visitor.created_at);
  }
  return [...map.values()]
    .map((folder) => {
      const companies = new Set(
        folder.people
          .map((capture) => capture.company_name)
          .concat(folder.signalCompanies)
          .filter(Boolean)
      );
      const captureLatest = folder.people.reduce((current, capture) => {
        const created = new Date(capture.created_at).getTime();
        return Math.max(current, Number.isFinite(created) ? created : 0);
      }, 0);
      const signalLatest = folder.signalDates.reduce((current, timestamp) => {
        const created = new Date(timestamp).getTime();
        return Math.max(current, Number.isFinite(created) ? created : 0);
      }, 0);
      return {
        ...folder,
        companyCount: companies.size,
        latest: Math.max(captureLatest, signalLatest),
        prep: buildFolderPrep(folder.name, folder.people, companies),
        reviewReady: folder.people.filter((capture) => capture.status === "review_ready").length,
        openCount: folder.people.filter((capture) => capture.status !== "review_ready").length
      };
    })
    .sort((a, b) => b.latest - a.latest);
}

function groupSocialCandidates(candidates) {
  const map = new Map();
  for (const candidate of candidates) {
    const key = normalizeEventName(candidate.event_name).toLowerCase();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(candidate);
  }
  return map;
}

function groupEventSiteVisitors(visitors) {
  const map = new Map();
  for (const visitor of visitors) {
    const key = normalizeEventName(visitor.event_name).toLowerCase();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(visitor);
  }
  return map;
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

function buildStats(captures, socialCandidates = [], siteVisitors = []) {
  const eventNames = new Set([
    ...captures.map((capture) => normalizeEventName(capture.event_name)),
    ...socialCandidates.map((candidate) => normalizeEventName(candidate.event_name)),
    ...siteVisitors.map((visitor) => normalizeEventName(visitor.event_name))
  ]);
  const companies = new Set(
    captures
      .map((capture) => capture.company_name)
      .concat(socialCandidates.map((candidate) => candidate.author_company))
      .concat(siteVisitors.map((visitor) => visitor.company))
      .filter(Boolean)
  );
  return {
    events: eventNames.size,
    people: captures.length,
    companies: companies.size,
    confirmed: siteVisitors.length,
    prospects: socialCandidates.filter((candidate) => candidate.status !== "converted").length,
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
    objective: people.length
      ? `Prepare for ${name} with ${people.length} captured ${
          people.length === 1 ? "person" : "people"
        }, ${reviewReady} review-ready follow-up${open ? `, and ${open} still open` : ""}.`
      : `Prepare for ${name} from saved event signals, then convert the highest-fit visitors into captures.`,
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

function socialCandidateMatches(candidate, query) {
  return [
    candidate.event_name,
    candidate.author_name,
    candidate.author_handle,
    candidate.author_company,
    candidate.author_title,
    candidate.post_text
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function eventSiteVisitorMatches(visitor, query) {
  return [
    visitor.event_name,
    visitor.name,
    visitor.company,
    visitor.title,
    visitor.visitor_role,
    visitor.source_label,
    ...(visitor.evidence || [])
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

function splitList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLabel(value) {
  return String(value || "").replace(/_/g, " ");
}

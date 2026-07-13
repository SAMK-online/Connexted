import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Radio,
  FileText,
  ShieldCheck,
  RefreshCw,
  Check,
  X,
  Share2,
  Activity,
  ClipboardList,
  MessageSquareText,
  CircleHelp,
  Ban,
  ListChecks
} from "lucide-react";
import { createReview, getAgentRun, getReport, regenerateDraft, syncHubSpot } from "../lib/api.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CONFIDENCE_STYLES = {
  high: "border-transparent bg-signal text-signal-foreground",
  medium: "border-border text-foreground",
  low: "border-border text-muted-foreground"
};

function ConfidenceBadge({ level, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider",
        CONFIDENCE_STYLES[level] || "border-border text-muted-foreground"
      )}
    >
      {children || `${level} confidence`}
    </span>
  );
}

function Warning({ children }) {
  return (
    <p className="rounded-md border-l-2 border-foreground bg-secondary/50 px-3 py-2 text-sm text-foreground/80">
      {children}
    </p>
  );
}

export default function Report() {
  const { captureId } = useParams();
  const queryClient = useQueryClient();
  const report = useQuery({
    queryKey: ["report", captureId],
    queryFn: () => getReport(captureId),
    retry: false
  });
  const agentRun = useQuery({
    queryKey: ["agentRun", captureId],
    queryFn: () => getAgentRun(captureId),
    retry: false
  });

  const review = useMutation({
    mutationFn: createReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report", captureId] })
  });
  const regenerate = useMutation({
    mutationFn: ({ draftId, command }) => regenerateDraft(draftId, { command }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report", captureId] })
  });
  const crm = useMutation({ mutationFn: syncHubSpot });

  const backLink = (
    <Link
      to="/app"
      className="mb-6 inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Captures
    </Link>
  );

  if (report.isLoading) {
    return (
      <section>
        {backLink}
        <p className="text-muted-foreground">Loading report…</p>
      </section>
    );
  }
  if (report.isError) {
    return (
      <section>
        {backLink}
        <Warning>Report is not ready yet. Refresh after the workflow finishes.</Warning>
      </section>
    );
  }

  const data = report.data;

  return (
    <section>
      {backLink}

      <header className="mb-8 border-b border-border pb-8">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          Review-ready report
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold leading-[1.02] tracking-tightest">
            {data.contact.name || "Unknown contact"}
            <span className="text-muted-foreground"> · </span>
            {data.company.name || "Unknown company"}
          </h1>
          <ConfidenceBadge level={data.confidence} />
        </div>
      </header>

      {/* Recommended action */}
      <Card className="mb-6 overflow-hidden border-foreground/15 shadow-[inset_0_2px_0_hsl(var(--signal))]">
        <div className="border-b border-border bg-secondary/40 px-6 py-3">
          <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
            Recommended action
          </span>
        </div>
        <CardContent className="pt-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {data.strategy.recommended_angle}
          </h2>
          <p className="mt-3 text-muted-foreground">{data.strategy.next_best_action}</p>
          <p className="mt-3 text-sm">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">
              CTA:{" "}
            </span>
            {data.strategy.suggested_cta}
          </p>
          {data.warnings?.length ? (
            <div className="mt-5 flex flex-col gap-2">
              {data.warnings.map((warning) => (
                <Warning key={warning}>{warning}</Warning>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Meeting prep */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Meeting prep brief
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-0">
          <div className="rounded-lg border border-border bg-secondary/25 p-5">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              Objective
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              {data.meeting_prep?.objective || data.strategy.next_best_action}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PrepList
              icon={ListChecks}
              title="Agenda"
              items={data.meeting_prep?.agenda}
              fallback={["Confirm context", "Validate fit", "Agree on next step"]}
            />
            <PrepList
              icon={MessageSquareText}
              title="Talking points"
              items={data.meeting_prep?.talking_points}
              fallback={[data.strategy.value_prop]}
            />
            <PrepList
              icon={CircleHelp}
              title="Questions to ask"
              items={data.meeting_prep?.discovery_questions}
              fallback={["What happens after a promising event conversation today?"]}
            />
            <PrepList
              icon={Ban}
              title="Avoid"
              items={data.meeting_prep?.avoid}
              fallback={["Do not use unverified claims as confirmed facts."]}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PrepList
              title="Likely objections"
              items={data.meeting_prep?.likely_objections}
              fallback={data.strategy.objections}
            />
            <PrepList
              title="Follow-up plan"
              items={data.meeting_prep?.follow_up_plan}
              fallback={["Send recap", "Confirm CTA", "Sync approved notes to HubSpot"]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signals + Evidence */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4" /> Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.signals.map((signal, i) => (
              <div
                key={signal.id}
                className={cn(
                  "flex items-start justify-between gap-4 py-4",
                  i > 0 && "border-t border-border"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm capitalize">
                      {signal.signal_type.replace(/_/g, " ")}
                    </strong>
                    {signal.inferred ? (
                      <Badge variant="muted">Inferred</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{signal.summary}</p>
                </div>
                <ConfidenceBadge level={signal.confidence}>{signal.confidence}</ConfidenceBadge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.sources.map((source, i) => (
              <div
                key={source.id}
                className={cn("py-4", i > 0 && "border-t border-border")}
              >
                <div className="flex items-center gap-2">
                  <strong className="text-sm">{source.title}</strong>
                  {source.is_personal_social ? (
                    <Badge variant="muted">Personal social</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{source.snippet}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Draft review */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Draft review
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
          {data.drafts.map((draft) => (
            <article
              key={draft.id}
              className="rounded-lg border border-border bg-secondary/20 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm capitalize">
                  {draft.draft_type.replace(/_/g, " ")}
                </strong>
                <Badge variant={draft.review_status === "approved" ? "default" : "outline"}>
                  {draft.review_status}
                </Badge>
              </div>
              {draft.subject ? (
                <p className="mt-3 text-sm">
                  <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                    Subject:{" "}
                  </span>
                  {draft.subject}
                </p>
              ) : null}
              <pre className="mt-3 whitespace-pre-wrap rounded-md border-l-2 border-signal bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
                {draft.body}
              </pre>
              {draft.inferred_claims_used ? (
                <div className="mt-3">
                  <Warning>
                    Uses inferred claims: {draft.inferred_claim_notes.join("; ")}
                  </Warning>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    review.mutate({
                      capture_id: captureId,
                      target_type: "draft",
                      target_id: draft.id,
                      action: "approve"
                    })
                  }
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    review.mutate({
                      capture_id: captureId,
                      target_type: "draft",
                      target_id: draft.id,
                      action: "reject"
                    })
                  }
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => regenerate.mutate({ draftId: draft.id, command: "shorter" })}
                >
                  <RefreshCw className="h-4 w-4" /> Shorter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    regenerate.mutate({ draftId: draft.id, command: "remove inferred claims" })
                  }
                >
                  Remove inferred claims
                </Button>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      {/* CRM sync */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> CRM sync
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                review.mutate({
                  capture_id: captureId,
                  target_type: "capture",
                  target_id: captureId,
                  action: "approve_crm_sync"
                })
              }
            >
              <ShieldCheck className="h-4 w-4" /> Approve CRM sync
            </Button>
            <Button onClick={() => crm.mutate({ capture_id: captureId })}>
              <Share2 className="h-4 w-4" /> Sync HubSpot
            </Button>
          </div>
          {crm.data ? (
            <p className="mt-4 text-sm text-muted-foreground">{crm.data.message}</p>
          ) : null}
          {crm.error ? (
            <div className="mt-4">
              <Warning>{crm.error.message}</Warning>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Agent trace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Agent trace
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ol className="relative flex flex-col">
            {(agentRun.data?.steps || []).map((step, i, arr) => (
              <li key={step.id} className="flex gap-4 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-border bg-card font-mono text-[0.65rem]">
                    {i + 1}
                  </span>
                  {i < arr.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm capitalize">
                      {step.name.replace(/_/g, " ")}
                    </strong>
                    <Badge variant="muted">{step.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.rationale || step.output_summary}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

function PrepList({ icon: Icon, title, items, fallback = [] }) {
  const list = items?.length ? items : fallback;
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {list.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  LifeBuoy,
  ListChecks,
  MessageSquareWarning,
  PlugZap,
  ShieldCheck,
  Timer,
  UsersRound
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BEFORE_DAY_ONE = [
  "Deploy from the production runbook, or run locally and screen-share for the first customer demo.",
  "Choose the week-one CRM path: HubSpot, a custom adapter, or CSV export.",
  "Have pilot reps join the Twilio WhatsApp sandbox if WhatsApp capture is part of the trial.",
  "Create one test capture yourself and walk it through report review, draft approval, and CRM sync or export."
];

const DAY_ONE_STEPS = [
  {
    title: "Set up their workspace",
    detail:
      "The customer lead registers at /register, creates the organization, generates an invite code in Team access, and each rep joins from the /join link."
  },
  {
    title: "Configure the Playbook together",
    detail:
      "Capture ICP, target personas, products offered, sectors, priority GTM signals, proof points, personalization rules, and trusted research sources."
  },
  {
    title: "Capture a real lead live",
    detail:
      "Use actual recent event notes, review the generated report, edit a draft, approve it, then sync or export the result."
  },
  {
    title: "Teach the review model",
    detail:
      "Make clear that nothing sends automatically, inferred claims are labeled, warnings call out missing context, and agent steps stay visible."
  },
  {
    title: "Set expectations",
    detail:
      "Discuss current limitations directly: provider setup, conservative drafts, retrying stalled captures, and the authenticated web flow for user-scoped intake."
  }
];

const PILOT_METRICS = [
  "Captures created vs. captures reaching review ready",
  "Drafts approved as-is vs. edited vs. regenerated",
  "Time from conversation to approved follow-up",
  "CRM syncs or exports approved by reps",
  "Playbook changes needed after real usage"
];

const FEEDBACK_PROMPTS = [
  "Where did a report feel wrong: enrichment, strategy, evidence, or tone?",
  "Which confidence labels and warnings helped, and which created noise?",
  "What work did reps still do outside CONNEXTed?",
  "Which missing capability blocks production use?",
  "What company context should the Playbook capture better?"
];

const SUPPORT_ROWS = [
  {
    symptom: "Capture stuck running",
    action: "Open the capture page and use Retry to re-queue the workflow."
  },
  {
    symptom: "Capture failed",
    action: "Open the agent trace, fix the provider key or quota issue, then retry."
  },
  {
    symptom: "WhatsApp message did not arrive",
    action: "Check Twilio logs, webhook URL, and sandbox enrollment for the sender phone."
  },
  {
    symptom: "HubSpot sync error",
    action: "The report is preserved. Check HubSpot scopes and token state, then approve sync again."
  },
  {
    symptom: "Mock mode warning",
    action: "Expected until live provider keys are configured in the deployment environment."
  }
];

function quickLinks(guidePath) {
  return [
    { label: "Register workspace", to: "/register" },
    { label: "Open Playbook", to: "/app/playbook" },
    { label: "Team access", to: "/app/settings" },
    { label: "Feature guide", to: guidePath }
  ];
}

export default function OnboardingDocs({ standalone = false }) {
  const docsPath = standalone ? "/docs" : "/app/docs";
  const guidePath = standalone ? "/docs/guide" : "/app/docs/guide";

  return (
    <div className={standalone ? "min-h-screen bg-background" : ""}>
      {standalone ? <OnboardingNav /> : null}
      <main className={standalone ? "mx-auto max-w-[1160px] px-5 py-10 lg:px-8" : ""}>
        <PageHeader
          eyebrow="Pilot onboarding"
          title="First customer onboarding docs"
          subtitle="A week-one operating plan for setting up a pilot workspace, guiding reps through the first live capture, and collecting the feedback that determines whether CONNEXTed is ready for production."
          action={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">45 min day-one session</Badge>
              <Button asChild variant="outline" size="sm">
                <Link to={docsPath}>Docs index</Link>
              </Button>
            </div>
          }
        />

        <PilotProof />
        <QuickLinks guidePath={guidePath} />
        <BeforeDayOne />
        <DayOneSession />
        <DuringPilot />
        <FeedbackAndSupport />
      </main>
    </div>
  );
}

function OnboardingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link to="/">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Home</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/docs">Docs index</Link>
          </Button>
          <Button asChild size="sm" shape="pill" variant="accent">
            <Link to="/app">
              Open app
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function PilotProof() {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <BookOpenCheck className="h-5 w-5" />
          <CardTitle>What the pilot proves</CardTitle>
          <CardDescription>
            The pilot should measure whether reps capture more leads, faster, with better reviewed
            follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border bg-secondary/25 p-4">
            <p className="text-sm leading-relaxed text-foreground/85">
              CONNEXTed's pilot path is WhatsApp or web note to enriched report to
              human-reviewed outreach to CRM. Keep the trial focused on that loop rather than
              feature breadth.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Timer className="h-5 w-5" />
          <CardTitle>Recommended week-one shape</CardTitle>
          <CardDescription>
            Start with a short working session, then measure real event and meeting leads for two
            to three weeks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <TimelineItem label="Before day one" value="Deploy, configure providers, and test the full flow." />
          <TimelineItem label="Day one" value="Register the workspace, invite reps, tune Playbook, and process one real lead." />
          <TimelineItem label="Pilot run" value="Route every event or meeting lead through the product for clean signal." />
        </CardContent>
      </Card>
    </section>
  );
}

function QuickLinks({ guidePath }) {
  return (
    <section className="mt-8 grid gap-3 rounded-lg border border-border bg-foreground p-4 text-background md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="flex items-center gap-2">
          <PlugZap className="h-4 w-4 text-signal" />
          <p className="font-display text-lg font-semibold tracking-tight">Day-one shortcuts</p>
        </div>
        <p className="mt-1 text-sm text-background/65">
          Use these after the backend is running with the intended auth and provider settings.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickLinks(guidePath).map((link) => (
          <Button key={link.label} asChild variant="secondary" size="sm">
            <Link to={link.to}>{link.label}</Link>
          </Button>
        ))}
      </div>
    </section>
  );
}

function BeforeDayOne() {
  return (
    <section className="mt-10">
      <SectionHeading
        icon={ClipboardCheck}
        eyebrow="Before day one"
        title="Prepare the pilot environment"
        description="Budget about two hours to remove avoidable setup noise before the customer working session."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {BEFORE_DAY_ONE.map((item, index) => (
          <ChecklistItem key={item} index={index + 1} text={item} />
        ))}
      </div>
    </section>
  );
}

function DayOneSession() {
  return (
    <section className="mt-10">
      <SectionHeading
        icon={UsersRound}
        eyebrow="Day one"
        title="Run a 45-minute customer working session"
        description="Keep the session hands-on: create accounts, tune context, process a real lead, and explain the review model."
      />
      <div className="mt-6 grid gap-4">
        {DAY_ONE_STEPS.map((step, index) => (
          <article
            key={step.title}
            className="grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[72px_1fr]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-md border border-border bg-secondary/40 font-mono text-sm">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DuringPilot() {
  return (
    <section className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <ListChecks className="h-5 w-5" />
          <CardTitle>During the pilot</CardTitle>
          <CardDescription>
            Ask reps to run every event or meeting lead through CONNEXTed. Partial adoption makes
            the feedback harder to interpret.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link to="/app">
              Create a capture
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <ShieldCheck className="h-5 w-5" />
          <CardTitle>Weekly metrics to inspect</CardTitle>
          <CardDescription>
            Read the edits and approvals, not only the counts. The edits are the product feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            {PILOT_METRICS.map((metric) => (
              <li key={metric} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function FeedbackAndSupport() {
  return (
    <section className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <MessageSquareWarning className="h-5 w-5" />
          <CardTitle>Feedback to collect</CardTitle>
          <CardDescription>
            Ask for concrete examples from real captures instead of broad opinions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm text-muted-foreground">
            {FEEDBACK_PROMPTS.map((prompt, index) => (
              <li key={prompt} className="flex gap-3">
                <span className="font-mono text-xs text-foreground/70">0{index + 1}</span>
                <span>{prompt}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <LifeBuoy className="h-5 w-5" />
          <CardTitle>Support playbook</CardTitle>
          <CardDescription>
            Triage the common pilot issues without losing the underlying report work.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {SUPPORT_ROWS.map((row) => (
            <div key={row.symptom} className="rounded-md border border-border bg-secondary/25 p-3">
              <p className="text-sm font-medium">{row.symptom}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{row.action}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, description }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
          <Icon className="h-4 w-4" />
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function TimelineItem({ label, value }) {
  return (
    <div className="grid gap-1 rounded-md border border-border bg-secondary/25 p-3">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-foreground/85">{value}</p>
    </div>
  );
}

function ChecklistItem({ index, text }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-4">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border font-mono text-xs">
        {index}
      </span>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

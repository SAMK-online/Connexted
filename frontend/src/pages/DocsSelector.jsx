import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FolderOpen,
  GitBranch,
  Search,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FEATURE_DOCS, WORKFLOW_EXAMPLES } from "./Docs.jsx";

const GUIDE_GROUPS = [
  {
    title: "Plan the event",
    icon: Search,
    description: "Use this when you are choosing events, reading public event pages, or finding who may be in the room.",
    docIds: ["event-radar", "confirmed-visitors", "social-intent", "event-folders"]
  },
  {
    title: "Capture and research",
    icon: ClipboardList,
    description: "Use this after a conversation or once a visitor should become a worked lead.",
    docIds: ["captures", "reports"]
  },
  {
    title: "Guide the agents",
    icon: Target,
    description: "Use this to make research, enrichment, and drafts specific to your company use case.",
    docIds: ["playbook", "style"]
  },
  {
    title: "Review and handoff",
    icon: ShieldCheck,
    description: "Use this when output is ready for approval, CRM sync, or public-post intake.",
    docIds: ["review-crm", "extension"]
  }
];

const QUICK_PATHS = [
  {
    title: "I am preparing before an event",
    icon: Search,
    description: "Start with Event Radar, confirmed visitor deep dives, and social intent.",
    target: "event-radar"
  },
  {
    title: "I met someone and need follow-up",
    icon: ClipboardList,
    description: "Create a capture, review the generated report, then approve drafts or CRM sync.",
    target: "captures"
  },
  {
    title: "I need better personalization",
    icon: Sparkles,
    description: "Tune products, sectors, priority signals, trusted sources, proof points, and tone.",
    target: "playbook"
  },
  {
    title: "I need safe CRM handoff",
    icon: GitBranch,
    description: "Verify evidence, approve the report, then sync HubSpot only after review.",
    target: "review-crm"
  }
];

export default function DocsSelector({ standalone = false }) {
  const guidePath = standalone ? "/docs/guide" : "/app/docs/guide";

  return (
    <div className={standalone ? "min-h-screen bg-background" : ""}>
      {standalone ? <SelectorNav /> : null}
      <main className={standalone ? "mx-auto max-w-[1160px] px-5 py-10 lg:px-8" : ""}>
        <PageHeader
          eyebrow="Docs selector"
          title="Find the right guide fast"
          subtitle="Choose a feature category, workflow, or practical starting point before opening the detailed product docs."
          action={<Badge variant="outline">{FEATURE_DOCS.length} docs</Badge>}
        />

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
          <Card>
            <CardHeader>
              <BookOpen className="h-5 w-5" />
              <CardTitle>Start with a category</CardTitle>
              <CardDescription>
                The docs are grouped by the way teams actually use CONNEXTed around events.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {GUIDE_GROUPS.map((group) => (
                <GuideGroup key={group.title} group={group} guidePath={guidePath} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FolderOpen className="h-5 w-5" />
              <CardTitle>Quick reference</CardTitle>
              <CardDescription>
                Jump to the most common jobs without reading the full guide first.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {QUICK_PATHS.map((path) => (
                <QuickPath key={path.title} path={path} guidePath={guidePath} />
              ))}
              <Button asChild className="mt-3" shape="pill">
                <Link to={guidePath}>
                  Open full docs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <WorkflowSelector guidePath={guidePath} />
        <FeatureMatrix guidePath={guidePath} />
      </main>
    </div>
  );
}

function SelectorNav() {
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

function GuideGroup({ group, guidePath }) {
  const Icon = group.icon;
  const docs = docsFor(group.docIds);

  return (
    <div className="rounded-md border border-border bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-background">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight">{group.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {docs.map((doc) => (
          <Button key={doc.id} asChild variant="outline" size="sm">
            <Link to={`${guidePath}#${doc.id}`}>{doc.title}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

function QuickPath({ path, guidePath }) {
  const Icon = path.icon;
  return (
    <Link
      to={`${guidePath}#${path.target}`}
      className="group grid gap-2 rounded-md border border-border bg-secondary/20 p-3 transition-colors hover:border-foreground/30"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{path.title}</span>
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{path.description}</p>
    </Link>
  );
}

function WorkflowSelector({ guidePath }) {
  return (
    <section className="mt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            Workflow selector
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Choose by where you are in the event cycle
          </h2>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`${guidePath}#workflows`}>
            View workflows
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {WORKFLOW_EXAMPLES.map((workflow) => (
          <Card key={workflow.title}>
            <CardHeader>
              <workflow.icon className="h-5 w-5" />
              <CardTitle>{workflow.title}</CardTitle>
              <CardDescription>{workflow.result}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link to={`${guidePath}#workflows`}>
                  Read workflow
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FeatureMatrix({ guidePath }) {
  return (
    <section className="mt-10">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
        Feature reference
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Every doc at a glance
      </h2>

      <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border">
        {FEATURE_DOCS.map((doc) => {
          const Icon = doc.icon;
          return (
            <Link
              key={doc.id}
              to={`${guidePath}#${doc.id}`}
              className="grid gap-3 bg-background p-4 transition-colors hover:bg-secondary/35 md:grid-cols-[240px_1fr_auto]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-secondary/40">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{doc.category}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{doc.purpose}</p>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-signal" />
                Open
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function docsFor(ids) {
  return ids.map((id) => FEATURE_DOCS.find((doc) => doc.id === id)).filter(Boolean);
}

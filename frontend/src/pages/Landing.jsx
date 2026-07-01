import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  MessageSquareText,
  Radar,
  ScanLine,
  Building2,
  Radio,
  Target,
  PenLine,
  ShieldCheck,
  RefreshCw,
  Share2,
  GitBranch,
  BookOpen,
  Sparkles
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#pipeline", label: "The pipeline" },
  { href: "#features", label: "Platform" },
  { href: "#trust", label: "Trust model" }
];

const MARQUEE = [
  "Sales reps at events",
  "Partnership teams",
  "RevOps",
  "GTM managers",
  "Channel leaders",
  "Field sales",
  "Founders selling",
  "Ecosystem teams"
];

const FLOWS = [
  {
    tag: "Flow 01",
    title: "Pre-event discovery",
    lead: "Know the room before you walk into it.",
    steps: [
      "Enter an industry, region, date range, personas, verticals, and keywords.",
      "CONNEXTed finds relevant events and qualifies them against your ICP and playbooks.",
      "It surfaces 2–3 public, high-potential people per event — speakers, sponsors, exhibitors, organizers.",
      "Every pick ships with why it's relevant, the evidence behind it, and a pre-event outreach angle."
    ]
  },
  {
    tag: "Flow 02",
    title: "Post-conversation capture",
    lead: "Send a card photo. Get a reviewed follow-up.",
    steps: [
      "Message a business-card image, prospect details, and quick notes through WhatsApp.",
      "A multi-agent workflow parses the card, enriches the person and company, and detects GTM signals.",
      "It drafts positioning, objections, next best action, and email + LinkedIn outreach.",
      "You review, edit, approve, reject, or regenerate — then sync to HubSpot or export."
    ]
  }
];

const PIPELINE = [
  {
    icon: ScanLine,
    name: "Contact extraction",
    detail: "Parses card and message data into normalized, deduplicated contact records."
  },
  {
    icon: Building2,
    name: "Enrichment",
    detail: "Adds company, person, source, and internal-memory context from public + private signals."
  },
  {
    icon: Radio,
    name: "Signal detection",
    detail: "Flags hiring, expansion, partnerships, funding, launches — each labeled with evidence."
  },
  {
    icon: Target,
    name: "Pitch strategy",
    detail: "Builds positioning, pain hypothesis, value prop, objections, and next best action."
  },
  {
    icon: PenLine,
    name: "Outreach drafting",
    detail: "Writes email and LinkedIn drafts grounded in evidence — never sent automatically."
  }
];

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "WhatsApp-first intake",
    body: "Capture leads at the moment of conversation — a photo and a few notes is all it takes."
  },
  {
    icon: Radar,
    title: "Event Radar",
    body: "Industry-relevant events and public prospects discovered before your team arrives."
  },
  {
    icon: GitBranch,
    title: "Multi-agent workflow",
    body: "A transparent chain of specialized agents, each step reviewable in the agent trace."
  },
  {
    icon: Building2,
    title: "Contact & company enrichment",
    body: "Normalized records enriched from public sources and your internal knowledge base."
  },
  {
    icon: Radio,
    title: "Evidence-backed signals",
    body: "Timely GTM reasons to follow up — every claim tied to a source or clearly marked inferred."
  },
  {
    icon: Target,
    title: "Pitch strategy",
    body: "Positioning, objections, and next steps generated from the actual conversation context."
  },
  {
    icon: PenLine,
    title: "Outreach drafts",
    body: "Email and LinkedIn drafts ready for human review — tone shaped by your style profiles."
  },
  {
    icon: ShieldCheck,
    title: "Human review controls",
    body: "Nothing leaves the building without approval. Outreach, CRM sync, and exports are gated."
  },
  {
    icon: RefreshCw,
    title: "Feedback & regeneration",
    body: "Reps edit and regenerate; approved edits teach the system what good looks like."
  },
  {
    icon: Share2,
    title: "CRM sync & CSV export",
    body: "Clean handoff to HubSpot or a spreadsheet — only after explicit approval."
  },
  {
    icon: BookOpen,
    title: "Playbooks & style profiles",
    body: "Encode your ICP, disqualifiers, value props, banned phrases, and CTA style once."
  },
  {
    icon: Sparkles,
    title: "Vector memory",
    body: "Supabase-backed memory keeps recommendations grounded in your team's history."
  }
];

const TRUST = [
  "Outreach is never sent automatically.",
  "CRM sync requires explicit approval.",
  "Inferred claims are labeled — source-backed facts keep their evidence.",
  "Draft edits and approvals are audited.",
  "Reps remain the final decision makers."
];

const STATS = [
  { value: "2–3", label: "Public prospects surfaced per event" },
  { value: "5", label: "Specialized agents in every capture run" },
  { value: "0", label: "Messages sent without human approval" },
  { value: "1", label: "Review surface for evidence, strategy & drafts" }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <Hero />
      <Marquee />
      <Problem />
      <Flows />
      <Pipeline />
      <Features />
      <Trust />
      <CtaBand />
      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link to="/">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/app">Sign in</Link>
          </Button>
          <Button asChild size="sm" shape="pill">
            <Link to="/app">
              Open app
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="relative mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="flex animate-fade-up items-center gap-3">
          <Badge variant="outline" className="gap-1.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            WhatsApp-first GTM
          </Badge>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            Edition 01 — Assisted, not automated
          </span>
        </div>

        <h1 className="mt-8 max-w-4xl animate-fade-up font-display text-[clamp(2.75rem,8vw,6.5rem)] font-semibold leading-[0.92] tracking-tightest text-balance">
          Turn event
          <br />
          conversations into
          <br />
          <span className="italic">reviewed follow-up.</span>
        </h1>

        <p className="mt-8 max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground">
          CONNEXTed is a WhatsApp-first GTM workflow platform. Discover the right events and
          prospects before you attend — then send a business card and quick notes to get
          enriched reports, evidence-backed signals, pitch strategy, and outreach drafts ready
          for your review.
        </p>

        <div className="mt-10 flex animate-fade-up flex-wrap items-center gap-4">
          <Button asChild size="lg" shape="pill">
            <Link to="/app">
              Start capturing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" shape="pill">
            <a href="#how">See how it works</a>
          </Button>
        </div>

        <dl className="mt-20 grid animate-fade-up grid-cols-2 gap-x-6 gap-y-8 border-t border-border pt-10 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                {stat.value}
              </dt>
              <dd className="mt-2 text-sm leading-snug text-muted-foreground">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <section className="overflow-hidden border-b border-border bg-secondary/40 py-4">
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-10 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"
          >
            {item}
            <span className="text-border">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function SectionLabel({ index, children }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-foreground">{index}</span>
      <span className="h-px w-8 bg-border" />
      {children}
    </div>
  );
}

function Problem() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <SectionLabel index="00">The problem</SectionLabel>
        <div className="mt-8 grid gap-12 md:grid-cols-[1.4fr_1fr] md:gap-16">
          <h2 className="font-display text-[clamp(1.9rem,4.5vw,3.4rem)] font-semibold leading-[1.05] tracking-tight text-balance">
            Promising conversations stay trapped in notebooks, badge scans, camera rolls, and
            scattered CRM notes.
          </h2>
          <div className="flex flex-col justify-end gap-5 text-muted-foreground">
            <p className="leading-relaxed">
              Sales and partnership teams lose momentum in the gap between a great conversation
              and a considered follow-up. The context fades, the notes go stale, and the CRM
              handoff is messy.
            </p>
            <p className="leading-relaxed">
              CONNEXTed makes capture-to-follow-up fast, contextual, and trustworthy — without
              removing human judgment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Flows() {
  return (
    <section id="how" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <SectionLabel index="01">How it works</SectionLabel>
        <h2 className="mt-8 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight">
          Two flows. One reviewed pipeline.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
          {FLOWS.map((flow) => (
            <div key={flow.title} className="bg-background p-8 md:p-10">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {flow.tag}
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight">
                {flow.title}
              </h3>
              <p className="mt-2 text-lg text-muted-foreground">{flow.lead}</p>
              <ol className="mt-8 flex flex-col gap-5">
                {flow.steps.map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border font-mono text-xs">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground/80">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  return (
    <section id="pipeline" className="border-b border-border bg-foreground text-background">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-background/50">
          <span className="text-background">02</span>
          <span className="h-px w-8 bg-background/30" />
          The multi-agent pipeline
        </div>
        <h2 className="mt-8 max-w-3xl font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight">
          Every capture runs a transparent chain of specialized agents.
        </h2>
        <p className="mt-5 max-w-xl text-background/60">
          Each step is inspectable in the agent trace — inputs, outputs, and rationale — so you
          always know why a recommendation exists.
        </p>

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-background/15 bg-background/15 md:grid-cols-5">
          {PIPELINE.map((step, i) => (
            <div key={step.name} className="flex flex-col gap-4 bg-foreground p-6">
              <div className="flex items-center justify-between">
                <step.icon className="h-5 w-5 text-background" />
                <span className="font-mono text-xs text-background/40">
                  0{i + 1}
                </span>
              </div>
              <h3 className="font-display text-base font-semibold leading-tight">
                {step.name}
              </h3>
              <p className="text-xs leading-relaxed text-background/55">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <SectionLabel index="03">The platform</SectionLabel>
        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight">
            Everything between the handshake and the handoff.
          </h2>
          <p className="max-w-sm text-muted-foreground">
            A complete GTM execution surface — built around assisted judgment, not blind
            automation.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group flex flex-col gap-4 bg-background p-7 transition-colors hover:bg-secondary/40"
            >
              <feature.icon className="h-5 w-5 text-foreground" />
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section id="trust" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:gap-20">
          <div>
            <SectionLabel index="04">Trust & review model</SectionLabel>
            <h2 className="mt-8 font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight">
              Assisted GTM execution. Never blind automation.
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              CONNEXTed is built so reps stay in control. The system does the research and the
              drafting; the human makes the call.
            </p>
            <Button asChild className="mt-8" shape="pill">
              <Link to="/app">
                Open the review desk
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ul className="flex flex-col">
            {TRUST.map((item, i) => (
              <li
                key={item}
                className="flex items-start gap-4 border-t border-border py-5 last:border-b"
              >
                <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                  0{i + 1}
                </span>
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
                <span className="text-base leading-relaxed text-foreground/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-24 text-center md:py-32">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          Ready when you are
        </span>
        <h2 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-tightest text-balance">
          Capture the conversation. Keep the judgment.
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" shape="pill">
            <Link to="/app">
              Open CONNEXTed
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" shape="pill">
            <a href="#features">Explore the platform</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <Wordmark />
        <nav className="flex flex-wrap items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/app"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Open app
          </Link>
        </nav>
      </div>
      <p className="mt-8 border-t border-border pt-8 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
        CONNEXTed — WhatsApp-first GTM intelligence · Human-reviewed outreach
      </p>
    </footer>
  );
}

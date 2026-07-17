import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  MessageSquareText,
  Radar,
  ScanLine,
  Building2,
  CheckCircle2,
  FolderOpen,
  Globe2,
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
import HeroCanvas from "@/components/HeroCanvas";
import heroImage from "@/assets/connexted-hero.png";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#event-intel", label: "Event intelligence" },
  { href: "#pipeline", label: "The pipeline" },
  { href: "#playbook", label: "Playbook" },
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
      "CONNEXTed qualifies events against your Playbook: target personas, priority signals, exclusions, and trusted sources.",
      "Run an event-site deep dive by pasting public speaker, sponsor, exhibitor, organizer, or attendee sections.",
      "It separates confirmed event-page visitors from prospective social intent and places both into the event folder.",
      "Every person or company ships with source evidence, confidence, relevance, and a pre-event outreach angle."
    ]
  },
  {
    tag: "Flow 02",
    title: "Event folder planning",
    lead: "Turn the event into a working account folder.",
    steps: [
      "Use the dashboard to see confirmed visitors, public social prospects, and captured conversations under one event.",
      "Convert the highest-fit event-site visitors into capture records when a rep wants to pursue them.",
      "Review folder prep: who to prioritize, what to cover, and which questions should shape meeting outreach.",
      "Keep source links and public evidence attached so reps can verify before referencing a claim."
    ]
  },
  {
    tag: "Flow 03",
    title: "Post-conversation capture",
    lead: "Send a card photo. Get a reviewed follow-up.",
    steps: [
      "Message a business-card image, prospect details, and quick notes through WhatsApp.",
      "A multi-agent workflow parses the card, enriches the person and company, and checks your saved source policy.",
      "It detects priority signals, applies proof points and value props, then drafts email + LinkedIn outreach.",
      "You review, edit, approve, reject, or regenerate — then sync to HubSpot or export."
    ]
  }
];

const PIPELINE = [
  {
    icon: CheckCircle2,
    name: "Visitor confirmation",
    detail: "Extracts confirmed visitors from public event pages and keeps the original source evidence attached."
  },
  {
    icon: FolderOpen,
    name: "Event foldering",
    detail: "Groups confirmed visitors, social prospects, captures, companies, and prep into one event workspace."
  },
  {
    icon: ScanLine,
    name: "Contact extraction",
    detail: "Parses card and message data into normalized, deduplicated contact records."
  },
  {
    icon: Building2,
    name: "Enrichment",
    detail: "Looks through trusted sources, pasted resources, and public context before enriching a record."
  },
  {
    icon: Radio,
    name: "Signal detection",
    detail: "Flags your priority signals — hiring, expansion, partnerships, funding, launches — with evidence."
  },
  {
    icon: Target,
    name: "Pitch strategy",
    detail: "Uses value props, proof points, competitors, and personalization rules to shape next steps."
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
    body: "Industry-relevant events, public prospects, and pre-event angles discovered before your team arrives."
  },
  {
    icon: CheckCircle2,
    title: "Confirmed visitor deep dives",
    body: "Paste public event-site data to identify speakers, sponsors, exhibitors, organizers, and listed attendees."
  },
  {
    icon: FolderOpen,
    title: "Event folders",
    body: "Each event becomes a working folder for confirmed visitors, social intent, captures, prep, and follow-up."
  },
  {
    icon: GitBranch,
    title: "Multi-agent workflow",
    body: "A transparent chain of specialized agents, each step reviewable in the agent trace."
  },
  {
    icon: Building2,
    title: "Contact & company enrichment",
    body: "Normalized records enriched from public sources, trusted resources, and your internal knowledge base."
  },
  {
    icon: Radio,
    title: "Evidence-backed signals",
    body: "Timely GTM reasons to follow up — weighted by your priority signals and tied to evidence."
  },
  {
    icon: Target,
    title: "Pitch strategy",
    body: "Positioning, objections, and next steps generated from conversation context and proof points."
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
    title: "Company-specific playbooks",
    body: "Encode personas, priority signals, trusted sources, proof points, competitors, and freshness rules."
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
  { value: "2", label: "Visitor signal modes: confirmed listings and social intent" },
  { value: "6", label: "Reviewable workflow steps per capture run" },
  { value: "0", label: "Messages sent without human approval" },
  { value: "1", label: "Review surface for evidence, strategy & drafts" }
];

const PLAYBOOK_CONTROLS = [
  {
    icon: Target,
    title: "Personas & fit",
    body: "Direct enrichment toward the buying committee, ICP segments, disqualifiers, and negative signals that matter."
  },
  {
    icon: Radio,
    title: "Priority signals",
    body: "Tell agents which triggers count: hiring, event sponsorship, partnerships, launches, funding, or expansion."
  },
  {
    icon: ShieldCheck,
    title: "Trusted sources",
    body: "Rank company sites, press releases, event pages, directories, pasted resources, and freshness windows."
  },
  {
    icon: Sparkles,
    title: "Proof & personalization",
    body: "Reuse approved proof points, competitor positioning, and rules for connecting research to outreach."
  }
];

const EVENT_INTEL = [
  {
    icon: CheckCircle2,
    title: "Confirmed visitors",
    body: "Paste public speaker, sponsor, exhibitor, organizer, or attendee sections from the event site. CONNEXTed extracts named people and companies, classifies their role, and preserves source evidence."
  },
  {
    icon: Radio,
    title: "Prospective visitors",
    body: "Import public social links and visible post text tied to an event. The system labels meeting intent, speaker signals, sponsor activity, and likely attendance separately from confirmed site listings."
  },
  {
    icon: FolderOpen,
    title: "Event folders",
    body: "Confirmed visitors, social prospects, WhatsApp captures, companies, and folder prep live under the event name so reps can plan who to meet before and after the show."
  },
  {
    icon: Target,
    title: "Personalized pursuit",
    body: "Every visitor inherits your Playbook: products offered, target sectors, priority signals, proof points, trusted sources, and personalization rules."
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <Hero />
      <Marquee />
      <Problem />
      <Flows />
      <EventIntelligence />
      <Pipeline />
      <PlaybookSection />
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
          <Link
            to="/docs"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/app">Sign in</Link>
          </Button>
          <Button asChild size="sm" shape="pill" variant="accent">
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
    <section className="dark bg-noise relative overflow-hidden border-b border-border bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <div className="relative mb-14 h-[320px] animate-fade-up md:h-[440px]">
          <HeroCanvas />
        </div>

        <div className="flex animate-fade-up items-center gap-3">
          <Badge variant="outline" className="gap-1.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-signal" />
            Event-first GTM
          </Badge>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            Edition 01 — Assisted, not automated
          </span>
        </div>

        <h1 className="mt-8 max-w-4xl animate-fade-up font-display text-[clamp(2.75rem,8vw,6.5rem)] font-semibold leading-[0.92] tracking-tightest text-balance">
          Turn event signals
          <br />
          and conversations into
          <br />
          <span className="italic text-signal">reviewed follow-up.</span>
        </h1>

        <p className="mt-8 max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground">
          CONNEXTed is an event-first GTM workflow platform. Discover relevant events, pull
          confirmed visitors from public event-site data, import social intent, then capture
          conversations through WhatsApp to generate enriched reports, pitch strategy, and
          outreach drafts for human review.
        </p>

        <div className="mt-10 flex animate-fade-up flex-wrap items-center gap-4">
          <Button asChild size="lg" shape="pill" variant="accent" className="glow-signal">
            <Link to="/app">
              Start capturing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" shape="pill">
            <a href="#how">See how it works</a>
          </Button>
        </div>

        <figure className="group mt-16 animate-fade-up overflow-hidden rounded-lg border border-border bg-foreground">
          <div className="relative">
            <img
              src={heroImage}
              alt="A rep on an event floor capturing a business card and WhatsApp conversation, with the CONNEXTed dashboard open on a laptop"
              className="h-[300px] w-full object-cover saturate-[0.85] transition-all duration-700 ease-out group-hover:saturate-100 md:h-[460px]"
              loading="eager"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-5 py-4">
              <span className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-background/85">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
                Fig. 01 — Plan the room, then capture the conversation
              </span>
              <span className="hidden font-mono text-[0.7rem] uppercase tracking-[0.2em] text-background/60 sm:inline">
                Event site · WhatsApp · CRM
              </span>
            </div>
          </div>
        </figure>

        <dl className="mt-16 grid animate-fade-up grid-cols-2 gap-x-6 gap-y-8 border-t border-border pt-10 md:grid-cols-4">
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
            <span className="text-signal">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function SectionLabel({ index, children }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-signal">{index}</span>
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
              CONNEXTed turns event pages, public intent, and in-person conversations into a
              single reviewed workflow — without removing human judgment.
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
          Three connected workflows. One reviewed pipeline.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
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

function EventIntelligence() {
  return (
    <section id="event-intel" className="border-b border-border bg-secondary/25">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <SectionLabel index="02">Event intelligence</SectionLabel>
        <div className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background">
              <Globe2 className="h-5 w-5" />
            </div>
            <h2 className="mt-6 font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight">
              See who is confirmed for an event before your team starts outreach.
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Event pages often reveal the highest-fit people in the room. CONNEXTed lets reps
              paste public site data, preserve the evidence, and turn the best confirmed
              visitors into capture records for deeper research.
            </p>
            <Button asChild className="mt-8" shape="pill">
              <Link to="/app/dashboard">
                Open event folders
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {EVENT_INTEL.map((item) => (
              <div key={item.title} className="bg-background p-7">
                <item.icon className="h-5 w-5" />
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
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
          <span className="text-signal">03</span>
          <span className="h-px w-8 bg-background/30" />
          The multi-agent pipeline
        </div>
        <h2 className="mt-8 max-w-3xl font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight">
          Every pursued visitor runs through a transparent chain of specialized agents.
        </h2>
        <p className="mt-5 max-w-xl text-background/60">
          Each step is inspectable in the agent trace — inputs, outputs, and rationale — so you
          always know why a recommendation exists.
        </p>

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-background/15 bg-background/15 md:grid-cols-3 lg:grid-cols-7">
          {PIPELINE.map((step, i) => (
            <div
              key={step.name}
              className="group flex flex-col gap-4 bg-foreground p-6 transition-colors hover:bg-foreground/95"
            >
              <div className="flex items-center justify-between">
                <step.icon className="h-5 w-5 text-background transition-colors group-hover:text-signal" />
                <span className="font-mono text-xs text-signal/60">
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

function PlaybookSection() {
  return (
    <section id="playbook" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <SectionLabel index="04">Directed research</SectionLabel>
        <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-tight">
              Your Playbook tells agents where to look and what matters.
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Generic enrichment creates generic outreach. CONNEXTed lets teams define the
              research sources, signals, personas, proof points, and positioning rules that fit
              their company.
            </p>
            <Button asChild className="mt-8" shape="pill">
              <Link to="/app/playbook">
                Configure the Playbook
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {PLAYBOOK_CONTROLS.map((control) => (
              <div key={control.title} className="bg-background p-7">
                <control.icon className="h-5 w-5" />
                <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                  {control.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {control.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
        <SectionLabel index="05">The platform</SectionLabel>
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
              <feature.icon className="h-5 w-5 text-foreground transition-colors group-hover:text-signal" />
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
            <SectionLabel index="06">Trust & review model</SectionLabel>
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
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
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
    <section className="dark bg-noise relative overflow-hidden border-b border-border bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-dense [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-24 text-center md:py-32">
        <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-signal" />
          Ready when you are
        </span>
        <h2 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-tightest text-balance">
          Know the room. Capture the conversation.{" "}
          <span className="italic text-signal">Keep the judgment.</span>
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" shape="pill" variant="accent" className="glow-signal">
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
            to="/docs"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            to="/app"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Open app
          </Link>
        </nav>
      </div>
      <p className="mt-8 flex items-center gap-2 border-t border-border pt-8 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
        CONNEXTed — Event-first GTM intelligence · Human-reviewed outreach
      </p>
    </footer>
  );
}

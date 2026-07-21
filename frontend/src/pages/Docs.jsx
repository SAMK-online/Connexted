import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderOpen,
  GitBranch,
  MessageSquareText,
  PenLine,
  Plug,
  Radar,
  Radio,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const FEATURE_DOCS = [
  {
    id: "event-radar",
    icon: Radar,
    title: "Event Radar",
    category: "Pre-event discovery",
    route: "/app/events",
    purpose:
      "Find industry-relevant events and public prospects before the team attends or reaches out.",
    use: [
      "Start with a narrow industry and region instead of a broad market.",
      "Add target personas so recommendations bias toward the right buying committee.",
      "Use verticals and keywords to steer toward events with the right business context.",
      "Treat generated prospects as public-role suggestions until a rep verifies the source."
    ],
    example:
      "Search for Cybersecurity in New York with personas 'Head of Partnerships' and 'VP Sales', vertical 'B2B SaaS', and keywords 'channel ecosystem' and 'partner pipeline'.",
    outcome:
      "You get a short list of events, public attendees to inspect, fit reasons, and pre-event outreach angles."
  },
  {
    id: "confirmed-visitors",
    icon: CheckCircle2,
    title: "Confirmed Visitor Deep Dive",
    category: "Event-site intelligence",
    route: "/app/dashboard",
    purpose:
      "Extract confirmed people and companies from public event-site data: speakers, sponsors, exhibitors, organizers, and listed attendees.",
    use: [
      "Paste the public speaker, sponsor, exhibitor, organizer, or attendee section from the event site.",
      "Include the event URL so source evidence can point reviewers back to the original page.",
      "Keep one event name consistent across deep dives, captures, and social imports.",
      "Convert only high-fit visitors into captures when a rep wants deeper enrichment and outreach."
    ],
    example:
      "Paste a speakers page containing 'Maya Patel - VP Partnerships, CloudScale' and a sponsors section with 'Pipeline Systems Group'.",
    outcome:
      "CONNEXTed labels the role, confidence, evidence line, source URL, relevance reason, and suggested approach."
  },
  {
    id: "social-intent",
    icon: Radio,
    title: "Social Intent Radar",
    category: "Prospective visitor signals",
    route: "/app/dashboard",
    purpose:
      "Capture public social posts that suggest someone may attend, speak, sponsor, or want meetings around an event.",
    use: [
      "Paste public post links from LinkedIn or X into the event folder.",
      "Add visible post text when the link alone does not carry enough context.",
      "Use hashtags and keywords like 'attending', 'speaking', 'booth', 'dinner', or 'book time'.",
      "Keep confirmed event-site listings separate from inferred social intent."
    ],
    example:
      "Import a LinkedIn post where a RevOps leader says they are attending SaaStr and looking for dinner meetings with partner-led GTM teams.",
    outcome:
      "The post becomes a prospective visitor with classification, confidence, evidence, source URL, and conversion action."
  },
  {
    id: "event-folders",
    icon: FolderOpen,
    title: "Event Folders",
    category: "Workspace organization",
    route: "/app/dashboard",
    purpose:
      "Use each event as a folder for confirmed visitors, social prospects, captures, companies, and meeting prep.",
    use: [
      "Use the same event name across every capture and import.",
      "Start from confirmed visitors, then add social intent and live conversation captures.",
      "Use folder prep to decide who to prioritize and what to cover in meetings.",
      "Convert visitor records before asking the agent to generate deeper reports and drafts."
    ],
    example:
      "Create the 'SaaStr Annual' folder, deep dive the speakers page, import dinner-intent posts, then add business-card captures after the event.",
    outcome:
      "The dashboard becomes the event command center for planning, follow-up, and review."
  },
  {
    id: "captures",
    icon: MessageSquareText,
    title: "Captures",
    category: "Conversation intake",
    route: "/app",
    purpose:
      "Turn WhatsApp notes, business-card text, and quick context into structured lead records.",
    use: [
      "Add the event name so the lead lands in the right folder.",
      "Include the raw card text, prospect name, company, and what was discussed.",
      "Write notes as concrete observations, not generic summaries.",
      "Mention next-step context like timing, pain, buyer role, or meeting intent."
    ],
    example:
      "Capture 'Grace Hopper, Compiler Labs' from AI Operators Summit with notes: 'Asked about HubSpot hygiene after booth scans; wants same-week follow-up with RevOps owner'.",
    outcome:
      "The workflow queues extraction, enrichment, signals, strategy, meeting prep, and drafts."
  },
  {
    id: "reports",
    icon: FileText,
    title: "Reports And Agent Trace",
    category: "Research output",
    route: "/app/dashboard",
    purpose:
      "Review normalized contact/company data, source evidence, detected signals, pitch strategy, meeting prep, and drafts.",
    use: [
      "Check the source list before using a claim in outreach.",
      "Look at confidence labels and warnings before approving a recommendation.",
      "Use meeting prep before a live conversation, not only after a capture.",
      "Inspect the agent trace when a result looks weak or missing context."
    ],
    example:
      "Open a converted event-site visitor and verify the source evidence before referencing their speaker role in the draft.",
    outcome:
      "Reps can approve, edit, regenerate, or reject outputs without losing the reasoning behind them."
  },
  {
    id: "playbook",
    icon: BookOpen,
    title: "Playbook",
    category: "Agent direction",
    route: "/app/playbook",
    purpose:
      "Tell the agents what your company sells, who you sell to, what sources to trust, and how to personalize.",
    use: [
      "Fill products offered and target sectors before running event discovery.",
      "Add disqualifiers and negative signals so low-fit prospects are deprioritized.",
      "Provide trusted resources and instructions for where research should look first.",
      "Use sector positioning to make reports specific to your company use case."
    ],
    example:
      "Products: 'event conversation intelligence' and 'HubSpot sync'. Sectors: 'B2B SaaS' and 'cybersecurity'. Priority signals: 'event sponsorship', 'partner hiring', 'RevOps pain'.",
    outcome:
      "Event recommendations, visitor angles, enrichment, and drafts become more specific to your GTM motion."
  },
  {
    id: "style",
    icon: PenLine,
    title: "Style Profiles",
    category: "Draft quality",
    route: "/app/settings",
    purpose:
      "Control tone, banned phrases, and CTA style so outreach sounds like your team.",
    use: [
      "Write tone rules that are concrete: direct, specific, low-hype, senior-friendly.",
      "Add banned phrases your team never wants in outbound.",
      "Define CTA style with a preferred meeting ask or next step.",
      "Regenerate drafts when the strategy is right but the language needs adjustment."
    ],
    example:
      "Tone: 'plainspoken and useful'. Banned phrases: 'just checking in', 'hope you are well'. CTA: 'ask for one specific 20-minute follow-up'.",
    outcome:
      "Drafts keep the same evidence but better match the voice your reps should use."
  },
  {
    id: "review-crm",
    icon: Share2,
    title: "Review And HubSpot Sync",
    category: "Human approval",
    route: "/app/settings",
    purpose:
      "Keep outreach and CRM writes gated behind explicit human review.",
    use: [
      "Review contact fields, company details, evidence, strategy, and drafts before approval.",
      "Approve CRM sync only after the report is ready to become a system-of-record update.",
      "Use HubSpot OAuth in Settings when moving from local mock mode to a connected CRM.",
      "Keep unapproved drafts out of outbound channels."
    ],
    example:
      "After reviewing a capture from an event dinner, approve CRM sync so HubSpot receives the contact, company, and follow-up task.",
    outcome:
      "The system accelerates follow-up without silently sending messages or writing to CRM."
  },
  {
    id: "extension",
    icon: Plug,
    title: "Browser Extension",
    category: "Public post capture",
    route: "/app/dashboard",
    purpose:
      "Send public social post URLs and selected text directly into CONNEXTed event folders.",
    use: [
      "Use it only for public posts or public profile context relevant to business outreach.",
      "Select the visible text that explains why the person may be attending or open to meetings.",
      "Attach posts to the matching event name so they appear beside confirmed visitors.",
      "Verify source context before converting a social candidate into a capture."
    ],
    example:
      "From a public LinkedIn post about attending Dreamforce, send the URL and selected meeting-intent text into the Dreamforce event folder.",
    outcome:
      "The post appears as a prospective visitor signal that can be reviewed and converted."
  }
];

export const WORKFLOW_EXAMPLES = [
  {
    title: "Before an event",
    icon: Search,
    steps: [
      "Run Event Radar with a narrow industry, region, personas, and keywords.",
      "Create or reuse the event folder from the dashboard.",
      "Paste the public event speakers and sponsors page into Confirmed Visitor Deep Dive.",
      "Convert the top confirmed visitors into captures for deeper enrichment."
    ],
    result: "The rep enters the event with a prioritized list and evidence-backed reasons to meet."
  },
  {
    title: "During the event",
    icon: ClipboardList,
    steps: [
      "Capture business cards and quick notes immediately after conversations.",
      "Use consistent event names so every person lands in the right folder.",
      "Add specific pain, timing, next step, and buying-role notes.",
      "Check the event folder before scheduling dinners or follow-up meetings."
    ],
    result: "The event folder becomes a live operating view instead of scattered notes."
  },
  {
    title: "After the event",
    icon: GitBranch,
    steps: [
      "Open each review-ready report.",
      "Verify evidence, signals, meeting prep, and drafts.",
      "Edit or regenerate drafts where the strategy is right but wording needs work.",
      "Approve HubSpot sync only when the record is ready."
    ],
    result: "Follow-up moves quickly while preserving human review and source quality."
  },
  {
    title: "Dinner meeting conversion",
    icon: Target,
    steps: [
      "Use social intent keywords like dinner, coffee, book time, and attending.",
      "Compare social prospects with confirmed event-site visitors.",
      "Convert the best-fit people into captures.",
      "Use meeting prep to decide what to cover before proposing a dinner conversation."
    ],
    result: "Reps can plan relationship-led meetings with context instead of generic asks."
  }
];

const PLAYBOOK_EXAMPLES = [
  {
    field: "Products offered",
    weak: "AI platform",
    strong: "WhatsApp-first event lead capture; event-site visitor intelligence; HubSpot-approved follow-up"
  },
  {
    field: "Target sectors",
    weak: "Software",
    strong: "B2B SaaS; cybersecurity; partnership-led growth teams; event-led GTM teams"
  },
  {
    field: "Priority signals",
    weak: "Interested lead",
    strong: "Event sponsorship; partner hiring; booth follow-up pain; CRM hygiene issue; same-week meeting intent"
  },
  {
    field: "Research instructions",
    weak: "Research the company",
    strong:
      "Check company site, event speaker page, recent press, partner pages, and pasted customer resources before using social context"
  }
];

const GUARDRAILS = [
  "Use public event-site and public social data only.",
  "Do not treat social intent as confirmed attendance unless the source explicitly says so.",
  "Verify source evidence before referencing a person, title, role, or company claim.",
  "Keep outreach and CRM sync behind human approval.",
  "Store company-specific context in the Playbook instead of repeating it in every capture."
];

export default function Docs({ standalone = false }) {
  const selectorPath = standalone ? "/docs" : "/app/docs";
  const onboardingPath = standalone ? "/docs/onboarding" : "/app/docs/onboarding";

  return (
    <div className={standalone ? "min-h-screen bg-background" : ""}>
      {standalone ? <DocsNav /> : null}
      <main className={standalone ? "mx-auto max-w-[1160px] px-5 py-10 lg:px-8" : ""}>
        <PageHeader
          eyebrow="Docs"
          title="CONNEXTed product docs"
          subtitle="Feature-level guidance, examples, and operating patterns for using CONNEXTed effectively before, during, and after events."
          action={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Feature guide</Badge>
              <Button asChild variant="outline" size="sm">
                <Link to={selectorPath}>Docs index</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={onboardingPath}>Onboarding</Link>
              </Button>
            </div>
          }
        />

        <QuickStart />
        <FeatureIndex />
        <WorkflowExamples />
        <PlaybookExamples />
        <Guardrails />
      </main>
    </div>
  );
}

function DocsNav() {
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

function QuickStart() {
  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <Sparkles className="h-5 w-5" />
          <CardTitle>Recommended operating loop</CardTitle>
          <CardDescription>
            The fastest way to get useful output is to move from event intelligence to capture to
            review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm text-muted-foreground">
            {[
              "Configure the Playbook with products, sectors, personas, trusted sources, and signals.",
              "Use Event Radar and confirmed visitor deep dives to build the event folder.",
              "Capture conversations and business-card context with the same event name.",
              "Review reports, evidence, meeting prep, and drafts before approving CRM sync."
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border font-mono text-xs text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <ShieldCheck className="h-5 w-5" />
          <CardTitle>What good usage looks like</CardTitle>
          <CardDescription>
            CONNEXTed works best when inputs are specific and claims stay source-backed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <ComparisonRow label="Good event name" value="SaaStr Annual 2026" />
          <ComparisonRow
            label="Good capture note"
            value="Asked about HubSpot cleanup after booth scans; wants same-week RevOps follow-up."
          />
          <ComparisonRow
            label="Good source input"
            value="Paste the actual public speaker/sponsor text plus the event URL."
          />
          <ComparisonRow
            label="Good review habit"
            value="Check evidence before referencing role, attendance, funding, or hiring claims."
          />
        </CardContent>
      </Card>
    </section>
  );
}

function FeatureIndex() {
  return (
    <section id="feature-docs" className="mt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            Feature docs
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Use each feature with the right input
          </h2>
        </div>
        <Badge variant="muted">{FEATURE_DOCS.length} feature guides</Badge>
      </div>

      <div className="mt-6 grid gap-4">
        {FEATURE_DOCS.map((doc) => (
          <FeatureDoc key={doc.id} doc={doc} />
        ))}
      </div>
    </section>
  );
}

function FeatureDoc({ doc }) {
  const Icon = doc.icon;
  return (
    <article
      id={doc.id}
      className="grid gap-5 rounded-lg border border-border bg-card p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
    >
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md border border-border bg-secondary/50">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <Badge variant="outline">{doc.category}</Badge>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">
              {doc.title}
            </h3>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{doc.purpose}</p>
        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link to={doc.route}>
            Open feature
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Use effectively
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-foreground/80">
            {doc.use.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 rounded-md border border-border bg-secondary/25 p-4 text-sm">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              Example
            </p>
            <p className="mt-1 text-foreground/85">{doc.example}</p>
          </div>
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              Expected output
            </p>
            <p className="mt-1 text-foreground/85">{doc.outcome}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function WorkflowExamples() {
  return (
    <section id="workflows" className="mt-10">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
        Workflow examples
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        How teams should sequence the product
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {WORKFLOW_EXAMPLES.map((workflow) => (
          <Card key={workflow.title}>
            <CardHeader>
              <workflow.icon className="h-5 w-5" />
              <CardTitle>{workflow.title}</CardTitle>
              <CardDescription>{workflow.result}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-2 text-sm text-muted-foreground">
                {workflow.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="font-mono text-xs text-foreground/70">0{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PlaybookExamples() {
  return (
    <section id="playbook-examples" className="mt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            Playbook examples
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Specific context beats generic context
          </h2>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/playbook">
            Edit Playbook
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border">
        {PLAYBOOK_EXAMPLES.map((item) => (
          <div
            key={item.field}
            className="grid gap-4 bg-background p-4 text-sm md:grid-cols-[180px_1fr_1.2fr]"
          >
            <p className="font-medium">{item.field}</p>
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Too vague
              </p>
              <p className="mt-1 text-muted-foreground">{item.weak}</p>
            </div>
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Better
              </p>
              <p className="mt-1 text-foreground/85">{item.strong}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Guardrails() {
  return (
    <section
      id="guardrails"
      className="mt-10 rounded-lg border border-border bg-foreground p-6 text-background"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-signal" />
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Operating guardrails
        </h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {GUARDRAILS.map((item) => (
          <div key={item} className="flex gap-3 rounded-md border border-background/15 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
            <p className="text-sm leading-relaxed text-background/70">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComparisonRow({ label, value }) {
  return (
    <div className="grid gap-1 rounded-md border border-border bg-secondary/25 p-3">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-foreground/85">{value}</p>
    </div>
  );
}

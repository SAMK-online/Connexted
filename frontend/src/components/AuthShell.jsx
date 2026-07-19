import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";

/** Split-panel frame for the auth pages: dark editorial rail + form column. */
export function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="dark bg-noise relative hidden flex-col justify-between overflow-hidden border-r border-border bg-background p-10 text-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3">
          <Wordmark className="rounded-md bg-foreground px-2 py-1 text-background" />
        </Link>
        <div className="relative z-10">
          <p className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-signal" />
            Human-reviewed GTM
          </p>
          <h2 className="mt-6 max-w-md font-display text-4xl font-semibold leading-[1.02] tracking-tight">
            Know the room. Capture the conversation.{" "}
            <span className="italic text-signal">Keep the judgment.</span>
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            One reviewed pipeline from event signal to CRM handoff — nothing sent
            without your team's approval.
          </p>
        </div>
        <p className="relative z-10 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          CONNEXTed — Event-first GTM intelligence
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <p className="flex items-center gap-2.5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

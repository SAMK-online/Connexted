import { NavLink, Outlet, Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Radar,
  Inbox,
  Settings2,
  ArrowUpRight,
  MessageSquareText
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Captures", icon: Inbox, end: true },
  { to: "/app/dashboard", label: "Dashboard", icon: FolderOpen, end: false },
  { to: "/app/events", label: "Event Radar", icon: Radar, end: false },
  { to: "/app/playbook", label: "Playbook", icon: BookOpen, end: false },
  { to: "/app/docs", label: "Docs", icon: FileText, end: false },
  { to: "/app/settings", label: "Settings", icon: Settings2, end: false }
];

export default function AppLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r border-border bg-foreground p-5 text-background lg:flex">
        <div className="flex flex-col gap-8">
          <Link to="/" className="group flex items-center justify-between">
            <Wordmark className="rounded-md bg-background px-2 py-1" />
            <ArrowUpRight className="h-4 w-4 text-background/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>

          <nav className="flex flex-col gap-1">
            <p className="px-3 pb-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-background/40">
              Workspace
            </p>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-background/10 text-background shadow-[inset_2px_0_0_hsl(var(--signal))]"
                      : "text-background/60 hover:bg-background/5 hover:text-background"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("h-4 w-4", isActive && "text-signal")} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-background/15 bg-background/5 p-4">
            <div className="flex items-center gap-2 text-background/80">
              <MessageSquareText className="h-4 w-4" />
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em]">
                WhatsApp intake
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-background/55">
              Local mock mode. Connect Twilio, OCR, research & HubSpot providers to go live.
            </p>
          </div>
          <div className="flex items-center justify-between px-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-background/40">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-signal" />
              System nominal
            </span>
            <span>v0.1 · Local</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-5 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-signal" />
            WhatsApp-first GTM
            <span className="hidden text-border sm:inline">/</span>
            <span className="hidden sm:inline">Human-reviewed outreach</span>
          </div>
          <Link
            to="/"
            className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            ← Home
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1160px] flex-1 px-5 py-8 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

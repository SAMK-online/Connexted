import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, AlertTriangle } from "lucide-react";
import { createCapture, listCaptures } from "../lib/api.js";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  queued: "border-border text-muted-foreground",
  running: "border-border text-foreground",
  review_ready: "border-transparent bg-foreground text-background",
  needs_input: "border-border text-foreground",
  failed: "border-destructive/40 text-destructive"
};

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

export default function Captures() {
  const queryClient = useQueryClient();
  const captures = useQuery({ queryKey: ["captures"], queryFn: listCaptures });
  const mutation = useMutation({
    mutationFn: createCapture,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["captures"] })
  });

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      organization_id: "demo-org",
      rep_id: "demo-rep",
      source: "web",
      raw_text: form.get("raw_text"),
      prospect_name: form.get("prospect_name"),
      company_name: form.get("company_name"),
      notes: form.get("notes")
    });
    event.currentTarget.reset();
  }

  const list = captures.data || [];

  return (
    <section>
      <PageHeader
        eyebrow="Review queue"
        title="Lead captures"
        subtitle="Convert WhatsApp notes and business cards into reviewed GTM follow-up."
        action={<Badge variant="outline">Action-priority sorting</Badge>}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <form
          onSubmit={submit}
          className="flex h-fit flex-col gap-5 rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <h2 className="font-display text-base font-semibold tracking-tight">
              New test capture
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prospect_name">Prospect name</Label>
            <Input id="prospect_name" name="prospect_name" placeholder="Ada Lovelace" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company_name">Company</Label>
            <Input id="company_name" name="company_name" placeholder="Analytical Engines Inc." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="raw_text">WhatsApp / card text</Label>
            <Textarea
              id="raw_text"
              name="raw_text"
              placeholder="Paste OCR text or WhatsApp notes for local testing"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Conversation notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Mentioned partnerships, hiring, funding, expansion…"
            />
          </div>
          <Button type="submit" disabled={mutation.isPending} className="mt-1">
            {mutation.isPending ? "Queueing…" : "Create test capture"}
          </Button>
        </form>

        <div className="flex flex-col gap-3">
          {captures.isLoading ? (
            <EmptyRow>Loading captures…</EmptyRow>
          ) : null}
          {!captures.isLoading && !list.length ? (
            <EmptyRow>No captures yet. Create a test capture to preview the workflow.</EmptyRow>
          ) : null}
          {list.map((capture) => (
            <Link
              key={capture.id}
              to={`/app/captures/${capture.id}`}
              className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 transition-all hover:border-foreground/30 hover:shadow-[0_1px_0_hsl(var(--foreground))]"
            >
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-semibold tracking-tight">
                  {capture.prospect_name || "Unknown prospect"}
                </h3>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {capture.company_name || "Company pending"}
                </p>
                {capture.warnings?.length ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {capture.warnings[0]}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={capture.status} />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmptyRow({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

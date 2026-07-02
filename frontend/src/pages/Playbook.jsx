import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  BriefcaseBusiness,
  FileCheck2,
  Link2,
  Radar,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Target
} from "lucide-react";
import { listPlaybooks, updatePlaybook } from "../lib/api.js";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_PLAYBOOK = {
  name: "",
  icp_segments: "",
  target_personas: "",
  disqualifiers: "",
  negative_signals: "",
  value_props: "",
  priority_signals: "",
  trusted_sources: "",
  research_resources: "",
  research_instructions: "",
  competitors: "",
  proof_points: "",
  personalization_rules: "",
  research_freshness_days: 90
};

export default function Playbook() {
  const queryClient = useQueryClient();
  const playbooks = useQuery({
    queryKey: ["admin", "playbooks"],
    queryFn: listPlaybooks
  });
  const activePlaybook = playbooks.data?.[0];
  const [form, setForm] = useState(EMPTY_PLAYBOOK);

  useEffect(() => {
    if (!activePlaybook) return;
    setForm({
      name: activePlaybook.name || "",
      icp_segments: listToText(activePlaybook.icp_segments),
      target_personas: listToText(activePlaybook.target_personas),
      disqualifiers: listToText(activePlaybook.disqualifiers),
      negative_signals: listToText(activePlaybook.negative_signals),
      value_props: listToText(activePlaybook.value_props),
      priority_signals: listToText(activePlaybook.priority_signals),
      trusted_sources: listToText(activePlaybook.trusted_sources),
      research_resources: listToText(activePlaybook.research_resources),
      research_instructions: activePlaybook.research_instructions || "",
      competitors: listToText(activePlaybook.competitors),
      proof_points: listToText(activePlaybook.proof_points),
      personalization_rules: listToText(activePlaybook.personalization_rules),
      research_freshness_days: activePlaybook.research_freshness_days || 90
    });
  }, [activePlaybook]);

  const mutation = useMutation({
    mutationFn: ({ id, payload }) => updatePlaybook(id, payload),
    onSuccess: (data) => {
      setForm({
        name: data.name || "",
        icp_segments: listToText(data.icp_segments),
        target_personas: listToText(data.target_personas),
        disqualifiers: listToText(data.disqualifiers),
        negative_signals: listToText(data.negative_signals),
        value_props: listToText(data.value_props),
        priority_signals: listToText(data.priority_signals),
        trusted_sources: listToText(data.trusted_sources),
        research_resources: listToText(data.research_resources),
        research_instructions: data.research_instructions || "",
        competitors: listToText(data.competitors),
        proof_points: listToText(data.proof_points),
        personalization_rules: listToText(data.personalization_rules),
        research_freshness_days: data.research_freshness_days || 90
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "playbooks"] });
    }
  });

  function submit(event) {
    event.preventDefault();
    if (!activePlaybook) return;
    mutation.mutate({
      id: activePlaybook.id,
      payload: {
        name: form.name.trim(),
        icp_segments: textToList(form.icp_segments),
        target_personas: textToList(form.target_personas),
        disqualifiers: textToList(form.disqualifiers),
        negative_signals: textToList(form.negative_signals),
        value_props: textToList(form.value_props),
        priority_signals: textToList(form.priority_signals),
        trusted_sources: textToList(form.trusted_sources),
        research_resources: textToList(form.research_resources),
        research_instructions: form.research_instructions.trim(),
        competitors: textToList(form.competitors),
        proof_points: textToList(form.proof_points),
        personalization_rules: textToList(form.personalization_rules),
        research_freshness_days: clampDays(form.research_freshness_days)
      }
    });
  }

  return (
    <section>
      <PageHeader
        eyebrow="Agent context"
        title="Playbook"
        subtitle="Direct enrichment, qualification, source selection, and personalization with company-specific rules."
        action={<Badge variant="outline">Default agent context</Badge>}
      />

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <BookOpen className="h-5 w-5" />
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Fit and qualification</CardTitle>
                  <CardDescription>
                    Define who the agents should consider relevant and who they should filter out.
                  </CardDescription>
                </div>
                <Badge variant="muted">Default</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <Field label="Name" htmlFor="playbook-name">
                <Input
                  id="playbook-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Research freshness days" htmlFor="research-freshness">
                <Input
                  id="research-freshness"
                  type="number"
                  min="1"
                  max="3650"
                  value={form.research_freshness_days}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      research_freshness_days: event.target.value
                    }))
                  }
                  required
                />
              </Field>
              <Field label="ICP segments" htmlFor="icp-segments">
                <Textarea
                  id="icp-segments"
                  value={form.icp_segments}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, icp_segments: event.target.value }))
                  }
                  placeholder={"B2B software\nPartnership-led growth"}
                />
              </Field>
              <Field label="Target personas" htmlFor="target-personas">
                <Textarea
                  id="target-personas"
                  value={form.target_personas}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, target_personas: event.target.value }))
                  }
                  placeholder={"VP Sales\nHead of Partnerships\nRevOps Director"}
                />
              </Field>
              <Field label="Disqualifiers" htmlFor="disqualifiers">
                <Textarea
                  id="disqualifiers"
                  value={form.disqualifiers}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, disqualifiers: event.target.value }))
                  }
                  placeholder={"Student project\nNon-business use"}
                />
              </Field>
              <Field label="Negative signals" htmlFor="negative-signals">
                <Textarea
                  id="negative-signals"
                  value={form.negative_signals}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, negative_signals: event.target.value }))
                  }
                  placeholder={"No B2B motion\nNo sales or partnerships team"}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Radar className="h-5 w-5" />
              <CardTitle>Signals and positioning</CardTitle>
              <CardDescription>
                Tell the agent which business triggers and proof points should drive strategy.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <Field label="Priority signals" htmlFor="priority-signals">
                <Textarea
                  id="priority-signals"
                  value={form.priority_signals}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, priority_signals: event.target.value }))
                  }
                  placeholder={"Event sponsorship\nNew partner program\nHiring revenue roles"}
                />
              </Field>
              <Field label="Value props" htmlFor="value-props">
                <Textarea
                  id="value-props"
                  value={form.value_props}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, value_props: event.target.value }))
                  }
                  placeholder={"Increase speed from event conversation to reviewed outreach"}
                />
              </Field>
              <Field label="Proof points" htmlFor="proof-points">
                <Textarea
                  id="proof-points"
                  value={form.proof_points}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, proof_points: event.target.value }))
                  }
                  placeholder={"Reduced follow-up time by 50%\nUsed by partnership-led SaaS teams"}
                />
              </Field>
              <Field label="Competitors / alternatives" htmlFor="competitors">
                <Textarea
                  id="competitors"
                  value={form.competitors}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, competitors: event.target.value }))
                  }
                  placeholder={"Manual CRM workflow\nGeneric enrichment tools\nSpreadsheet handoff"}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="h-5 w-5" />
              <CardTitle>Personalization rules</CardTitle>
              <CardDescription>
                Control how research should be connected to the pitch and outreach drafts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Field label="Rules" htmlFor="personalization-rules">
                <Textarea
                  id="personalization-rules"
                  value={form.personalization_rules}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      personalization_rules: event.target.value
                    }))
                  }
                  placeholder={
                    "Reference event context before product value\nAvoid generic funding congratulations\nTie every claim to a source"
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <Link2 className="h-5 w-5" />
              <CardTitle>Agent research resources</CardTitle>
              <CardDescription>
                Paste URLs, public directories, customer pages, event lists, or internal notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Trusted sources" htmlFor="trusted-sources">
                <Textarea
                  id="trusted-sources"
                  value={form.trusted_sources}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, trusted_sources: event.target.value }))
                  }
                  placeholder={"Company website\nPress releases\nEvent speaker pages"}
                />
              </Field>
              <Field label="Resources / places to look" htmlFor="research-resources">
                <Textarea
                  id="research-resources"
                  value={form.research_resources}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      research_resources: event.target.value
                    }))
                  }
                  className="min-h-[180px]"
                  placeholder={
                    "https://company.com/customers\nPartner directory\nEvent speaker page\nLinkedIn company page"
                  }
                />
              </Field>
              <Field label="Research instructions" htmlFor="research-instructions">
                <Textarea
                  id="research-instructions"
                  value={form.research_instructions}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      research_instructions: event.target.value
                    }))
                  }
                  placeholder="Tell agents which sources matter most, what to ignore, and where to verify claims."
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Search className="h-5 w-5" />
              <CardTitle>Agent usage</CardTitle>
              <CardDescription>
                Saved fields are loaded into enrichment, signal, strategy, and draft context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <UsageItem icon={Target} label="Qualification" value="ICP, personas, exclusions" />
                <UsageItem icon={ShieldAlert} label="Source policy" value="Trusted sources, freshness" />
                <UsageItem icon={FileCheck2} label="Evidence" value="Proof points, resources" />
                <UsageItem icon={BriefcaseBusiness} label="Positioning" value="Signals, competitors" />
              </div>
              <FormFooter
                disabled={playbooks.isLoading || !activePlaybook || mutation.isPending}
                isPending={mutation.isPending}
                isSaved={mutation.isSuccess}
                error={mutation.error}
              >
                Save playbook
              </FormFooter>
            </CardContent>
          </Card>
        </div>
      </form>
    </section>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function UsageItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 p-3">
      <Icon className="h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function FormFooter({ children, disabled, isPending, isSaved, error }) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
      <Button type="submit" disabled={disabled}>
        <Save className="h-4 w-4" />
        {isPending ? "Saving..." : children}
      </Button>
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {isSaved && !error ? (
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          Saved
        </p>
      ) : null}
    </div>
  );
}

function listToText(value) {
  return (value || []).join("\n");
}

function textToList(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampDays(value) {
  const parsed = Number(value || 90);
  if (Number.isNaN(parsed)) return 90;
  return Math.min(Math.max(Math.round(parsed), 1), 3650);
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Palette, Plug, Save, Shield } from "lucide-react";
import {
  listPlaybooks,
  listStyleProfiles,
  updatePlaybook,
  updateStyleProfile
} from "../lib/api.js";
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
  disqualifiers: "",
  value_props: ""
};

const EMPTY_STYLE_PROFILE = {
  name: "",
  tone: "",
  banned_phrases: "",
  cta_style: ""
};

const PENDING_PANELS = [
  {
    icon: Plug,
    title: "Integrations",
    description: "Twilio WhatsApp intake, OCR, research, LLM, and HubSpot connections."
  },
  {
    icon: Shield,
    title: "Governance",
    description: "Source policy, retention policy, and the approval gates on outreach and CRM sync."
  }
];

export default function Settings() {
  const queryClient = useQueryClient();
  const playbooks = useQuery({
    queryKey: ["admin", "playbooks"],
    queryFn: listPlaybooks
  });
  const styleProfiles = useQuery({
    queryKey: ["admin", "styleProfiles"],
    queryFn: listStyleProfiles
  });

  const activePlaybook = playbooks.data?.[0];
  const activeStyleProfile = styleProfiles.data?.[0];

  const [playbookForm, setPlaybookForm] = useState(EMPTY_PLAYBOOK);
  const [styleForm, setStyleForm] = useState(EMPTY_STYLE_PROFILE);

  useEffect(() => {
    if (!activePlaybook) return;
    setPlaybookForm({
      name: activePlaybook.name || "",
      icp_segments: listToText(activePlaybook.icp_segments),
      disqualifiers: listToText(activePlaybook.disqualifiers),
      value_props: listToText(activePlaybook.value_props)
    });
  }, [activePlaybook]);

  useEffect(() => {
    if (!activeStyleProfile) return;
    setStyleForm({
      name: activeStyleProfile.name || "",
      tone: activeStyleProfile.tone || "",
      banned_phrases: listToText(activeStyleProfile.banned_phrases),
      cta_style: activeStyleProfile.cta_style || ""
    });
  }, [activeStyleProfile]);

  const playbookMutation = useMutation({
    mutationFn: ({ id, payload }) => updatePlaybook(id, payload),
    onSuccess: (data) => {
      setPlaybookForm({
        name: data.name || "",
        icp_segments: listToText(data.icp_segments),
        disqualifiers: listToText(data.disqualifiers),
        value_props: listToText(data.value_props)
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "playbooks"] });
    }
  });

  const styleMutation = useMutation({
    mutationFn: ({ id, payload }) => updateStyleProfile(id, payload),
    onSuccess: (data) => {
      setStyleForm({
        name: data.name || "",
        tone: data.tone || "",
        banned_phrases: listToText(data.banned_phrases),
        cta_style: data.cta_style || ""
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "styleProfiles"] });
    }
  });

  function submitPlaybook(event) {
    event.preventDefault();
    if (!activePlaybook) return;
    playbookMutation.mutate({
      id: activePlaybook.id,
      payload: {
        name: playbookForm.name.trim(),
        icp_segments: textToList(playbookForm.icp_segments),
        disqualifiers: textToList(playbookForm.disqualifiers),
        value_props: textToList(playbookForm.value_props)
      }
    });
  }

  function submitStyleProfile(event) {
    event.preventDefault();
    if (!activeStyleProfile) return;
    styleMutation.mutate({
      id: activeStyleProfile.id,
      payload: {
        name: styleForm.name.trim(),
        tone: styleForm.tone.trim(),
        banned_phrases: textToList(styleForm.banned_phrases),
        cta_style: styleForm.cta_style.trim()
      }
    });
  }

  return (
    <section>
      <PageHeader
        eyebrow="Admin"
        title="Playbooks, style & integrations"
        subtitle="Configure the rules that keep agent recommendations aligned with your GTM motion."
        action={<Badge variant="outline">Editable defaults</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <form onSubmit={submitPlaybook}>
            <CardHeader>
              <BookOpen className="h-5 w-5" />
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Playbooks</CardTitle>
                  <CardDescription>
                    ICP segments, disqualifiers, and value props that shape strategy.
                  </CardDescription>
                </div>
                <Badge variant="muted">Default</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Name" htmlFor="playbook-name">
                <Input
                  id="playbook-name"
                  value={playbookForm.name}
                  onChange={(event) =>
                    setPlaybookForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="ICP segments" htmlFor="icp-segments">
                <Textarea
                  id="icp-segments"
                  value={playbookForm.icp_segments}
                  onChange={(event) =>
                    setPlaybookForm((current) => ({
                      ...current,
                      icp_segments: event.target.value
                    }))
                  }
                  placeholder={"B2B software\nPartnership-led growth"}
                />
              </Field>
              <Field label="Disqualifiers" htmlFor="disqualifiers">
                <Textarea
                  id="disqualifiers"
                  value={playbookForm.disqualifiers}
                  onChange={(event) =>
                    setPlaybookForm((current) => ({
                      ...current,
                      disqualifiers: event.target.value
                    }))
                  }
                  placeholder={"Student project\nNon-business use"}
                />
              </Field>
              <Field label="Value props" htmlFor="value-props">
                <Textarea
                  id="value-props"
                  value={playbookForm.value_props}
                  onChange={(event) =>
                    setPlaybookForm((current) => ({
                      ...current,
                      value_props: event.target.value
                    }))
                  }
                  placeholder={"Increase speed from event conversation to reviewed outreach"}
                />
              </Field>
              <FormFooter
                disabled={playbooks.isLoading || !activePlaybook || playbookMutation.isPending}
                isPending={playbookMutation.isPending}
                isSaved={playbookMutation.isSuccess}
                error={playbookMutation.error}
              >
                Save playbook
              </FormFooter>
            </CardContent>
          </form>
        </Card>

        <Card>
          <form onSubmit={submitStyleProfile}>
            <CardHeader>
              <Palette className="h-5 w-5" />
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Style profiles</CardTitle>
                  <CardDescription>
                    Tone, banned phrases, and CTA style for reviewed drafts.
                  </CardDescription>
                </div>
                <Badge variant="muted">Default</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Name" htmlFor="style-name">
                <Input
                  id="style-name"
                  value={styleForm.name}
                  onChange={(event) =>
                    setStyleForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Tone" htmlFor="tone">
                <Textarea
                  id="tone"
                  value={styleForm.tone}
                  onChange={(event) =>
                    setStyleForm((current) => ({ ...current, tone: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field label="Banned phrases" htmlFor="banned-phrases">
                <Textarea
                  id="banned-phrases"
                  value={styleForm.banned_phrases}
                  onChange={(event) =>
                    setStyleForm((current) => ({
                      ...current,
                      banned_phrases: event.target.value
                    }))
                  }
                  placeholder={"just checking in\nhope you're doing well"}
                />
              </Field>
              <Field label="CTA style" htmlFor="cta-style">
                <Textarea
                  id="cta-style"
                  value={styleForm.cta_style}
                  onChange={(event) =>
                    setStyleForm((current) => ({ ...current, cta_style: event.target.value }))
                  }
                  required
                />
              </Field>
              <FormFooter
                disabled={
                  styleProfiles.isLoading || !activeStyleProfile || styleMutation.isPending
                }
                isPending={styleMutation.isPending}
                isSaved={styleMutation.isSuccess}
                error={styleMutation.error}
              >
                Save style profile
              </FormFooter>
            </CardContent>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {PENDING_PANELS.map((panel) => (
          <Card key={panel.title}>
            <CardHeader>
              <panel.icon className="h-5 w-5" />
              <CardTitle>{panel.title}</CardTitle>
              <CardDescription>{panel.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                Configuration coming soon
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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

function FormFooter({ children, disabled, isPending, isSaved, error }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
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

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Link2, Save, Search } from "lucide-react";
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
  disqualifiers: "",
  value_props: "",
  research_resources: "",
  research_instructions: ""
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
      disqualifiers: listToText(activePlaybook.disqualifiers),
      value_props: listToText(activePlaybook.value_props),
      research_resources: listToText(activePlaybook.research_resources),
      research_instructions: activePlaybook.research_instructions || ""
    });
  }, [activePlaybook]);

  const mutation = useMutation({
    mutationFn: ({ id, payload }) => updatePlaybook(id, payload),
    onSuccess: (data) => {
      setForm({
        name: data.name || "",
        icp_segments: listToText(data.icp_segments),
        disqualifiers: listToText(data.disqualifiers),
        value_props: listToText(data.value_props),
        research_resources: listToText(data.research_resources),
        research_instructions: data.research_instructions || ""
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
        disqualifiers: textToList(form.disqualifiers),
        value_props: textToList(form.value_props),
        research_resources: textToList(form.research_resources),
        research_instructions: form.research_instructions.trim()
      }
    });
  }

  return (
    <section>
      <PageHeader
        eyebrow="Agent context"
        title="Playbook"
        subtitle="Control the ICP, value props, and research places the agents should prioritize."
        action={<Badge variant="outline">Default agent context</Badge>}
      />

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card>
          <CardHeader>
            <BookOpen className="h-5 w-5" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Qualification rules</CardTitle>
                <CardDescription>
                  These inputs shape event fit, signal interpretation, and pitch strategy.
                </CardDescription>
              </div>
              <Badge variant="muted">Default</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Name" htmlFor="playbook-name">
              <Input
                id="playbook-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
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
          </CardContent>
        </Card>

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
                Saved resources are loaded into the workflow trace and strategy context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                One item per line. Use this for websites, databases, event pages, directories, or
                named places the agent should inspect before drafting outreach.
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

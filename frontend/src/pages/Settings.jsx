import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, Palette, Plug, Save, Shield, UsersRound } from "lucide-react";
import {
  createInviteCode,
  getHubSpotStatus,
  hubspotInstallUrl,
  listStyleProfiles,
  updateStyleProfile
} from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

const DEMO_ORG = "demo-org";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_STYLE_PROFILE = {
  name: "",
  tone: "",
  banned_phrases: "",
  cta_style: ""
};

const PENDING_PANELS = [
  {
    icon: Shield,
    title: "Governance",
    description: "Source policy, retention policy, and the approval gates on outreach and CRM sync."
  }
];

export default function Settings() {
  const queryClient = useQueryClient();
  const styleProfiles = useQuery({
    queryKey: ["admin", "styleProfiles"],
    queryFn: listStyleProfiles
  });

  const activeStyleProfile = styleProfiles.data?.[0];
  const [styleForm, setStyleForm] = useState(EMPTY_STYLE_PROFILE);

  useEffect(() => {
    if (!activeStyleProfile) return;
    setStyleForm({
      name: activeStyleProfile.name || "",
      tone: activeStyleProfile.tone || "",
      banned_phrases: listToText(activeStyleProfile.banned_phrases),
      cta_style: activeStyleProfile.cta_style || ""
    });
  }, [activeStyleProfile]);

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
        title="Style & integrations"
        subtitle="Configure the controls that keep draft language and operational handoffs aligned."
        action={<Badge variant="outline">Admin controls</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
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

        <div className="grid gap-6">
          <TeamAccessCard />
          <HubSpotCard />
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
      </div>
    </section>
  );
}

function TeamAccessCard() {
  const { user, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const inviteMutation = useMutation({ mutationFn: createInviteCode });
  const invite = inviteMutation.data;
  const isAdmin = user && (user.role === "admin" || user.role === "manager");
  const joinUrl = invite ? `${window.location.origin}/join?code=${invite.code}` : "";

  async function copyJoinUrl() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <UsersRound className="h-5 w-5" />
        <CardTitle>Team access</CardTitle>
        <CardDescription>
          {isAuthenticated
            ? `Invite reps into the ${user.organization_name} workspace with a join code.`
            : "Sign in as a workspace admin to invite reps with a join code."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isAuthenticated ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            Demo mode — no workspace session
          </div>
        ) : !isAdmin ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            Only workspace admins can generate invite codes. Ask your admin for one.
          </div>
        ) : (
          <>
            {invite ? (
              <div className="rounded-md border border-signal/40 bg-secondary/30 p-4">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Active invite code
                </p>
                <p className="mt-2 font-mono text-xl font-semibold tracking-widest">
                  {invite.code}
                </p>
                <button
                  type="button"
                  onClick={copyJoinUrl}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : joinUrl}
                </button>
              </div>
            ) : null}
            <Button
              variant={invite ? "outline" : "default"}
              disabled={inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              {inviteMutation.isPending
                ? "Generating…"
                : invite
                  ? "Generate new code (revokes current)"
                  : "Generate invite code"}
            </Button>
            {inviteMutation.error ? (
              <p className="text-sm text-destructive">{inviteMutation.error.message}</p>
            ) : null}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Reps open the join link (or enter the code at /join) to create their own
              sign-in. Generating a new code deactivates the previous one.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HubSpotCard() {
  const status = useQuery({
    queryKey: ["admin", "hubspotStatus", DEMO_ORG],
    queryFn: () => getHubSpotStatus(DEMO_ORG)
  });

  // Read the ?hubspot=connected|error banner the OAuth callback redirects back with,
  // then strip the param so a refresh doesn't keep showing it.
  const [callbackResult, setCallbackResult] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("hubspot");
    if (!result) return;
    setCallbackResult(result);
    params.delete("hubspot");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
  }, []);

  const data = status.data;
  const configured = data?.configured;
  const connected = data?.connected;

  return (
    <Card>
      <CardHeader>
        <Plug className="h-5 w-5" />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>HubSpot</CardTitle>
            <CardDescription>
              Push reviewed contacts, companies, and follow-up tasks into your CRM.
            </CardDescription>
          </div>
          <ConnectionBadge status={status} configured={configured} connected={connected} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {callbackResult === "connected" ? (
          <Banner tone="success">HubSpot connected. You can now sync approved reports.</Banner>
        ) : null}
        {callbackResult === "error" ? (
          <Banner tone="error">HubSpot connection failed. Please try connecting again.</Banner>
        ) : null}

        {status.isLoading ? (
          <p className="text-sm text-muted-foreground">Checking connection…</p>
        ) : null}

        {status.error ? (
          <Banner tone="error">Couldn&apos;t load connection status: {status.error.message}</Banner>
        ) : null}

        {data && !configured ? (
          <div className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
            HubSpot isn&apos;t configured on the server. Set the <code>HUBSPOT_*</code> environment
            variables to enable it.
          </div>
        ) : null}

        {data && configured && connected ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-foreground" />
            <span>
              Connected
              {data.external_account_id ? ` to portal ${data.external_account_id}` : ""}.
            </span>
          </div>
        ) : null}

        {data && configured ? (
          <Button
            type="button"
            variant={connected ? "outline" : "default"}
            onClick={() => {
              window.location.href = hubspotInstallUrl(DEMO_ORG);
            }}
          >
            <Plug className="h-4 w-4" />
            {connected ? "Reconnect HubSpot" : "Connect HubSpot"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConnectionBadge({ status, configured, connected }) {
  if (status.isLoading) return <Badge variant="muted">Checking…</Badge>;
  if (!configured) return <Badge variant="muted">Not configured</Badge>;
  if (connected) return <Badge variant="outline">Connected</Badge>;
  return <Badge variant="muted">Not connected</Badge>;
}

function Banner({ tone, children }) {
  const toneClass =
    tone === "success"
      ? "border-border bg-secondary/40 text-foreground"
      : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}>{children}</div>
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

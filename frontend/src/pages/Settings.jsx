import { BookOpen, Palette, Plug, Shield } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PANELS = [
  {
    icon: BookOpen,
    title: "Playbooks",
    description: "ICP segments, disqualifiers, and value props that qualify events and shape strategy."
  },
  {
    icon: Palette,
    title: "Style profiles",
    description: "Tone, banned phrases, and CTA style so every draft sounds like your team."
  },
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
  return (
    <section>
      <PageHeader
        eyebrow="Admin"
        title="Playbooks, style & integrations"
        subtitle="Configure the rules that keep agent recommendations aligned with your GTM motion."
        action={<Badge variant="outline">Local mock mode</Badge>}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {PANELS.map((panel) => (
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

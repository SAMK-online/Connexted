import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth.jsx";

export default function JoinTeam() {
  const { join } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setPending(true);
    try {
      await join({
        invite_code: form.get("invite_code"),
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password")
      });
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Employee access"
      title="Join your team's workspace."
      subtitle="Use the invite code your workspace admin shared to create your rep account."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-signal">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite_code">Invite code</Label>
          <Input
            id="invite_code"
            name="invite_code"
            required
            placeholder="JOIN-XXXXXXXX"
            defaultValue={searchParams.get("code") || ""}
            className="font-mono uppercase tracking-widest"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required placeholder="Ada Lovelace" autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="accent" disabled={pending} className="mt-1">
          {pending ? "Joining…" : "Join workspace"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}

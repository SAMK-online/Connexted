import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setPending(true);
    try {
      await login({ email: form.get("email"), password: form.get("password") });
      navigate(location.state?.from || "/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back."
      subtitle="Sign in to your workspace to review captures, drafts, and CRM handoffs."
      footer={
        <div className="flex flex-col gap-2">
          <span>
            New company?{" "}
            <Link to="/register" className="font-medium text-foreground underline underline-offset-4 hover:text-signal">
              Register your organization
            </Link>
          </span>
          <span>
            Joining your team?{" "}
            <Link to="/join" className="font-medium text-foreground underline underline-offset-4 hover:text-signal">
              Use an invite code
            </Link>
          </span>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" variant="accent" disabled={pending} className="mt-1">
          {pending ? "Signing in…" : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}

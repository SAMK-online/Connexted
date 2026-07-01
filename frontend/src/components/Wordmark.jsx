import { cn } from "@/lib/utils";

export function Wordmark({ className, mark = true }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {mark ? (
        <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground text-background font-display text-sm font-bold tracking-tightest">
          C
        </span>
      ) : null}
      <span className="font-display text-base font-semibold tracking-tight">
        CONNEXTed
      </span>
    </span>
  );
}

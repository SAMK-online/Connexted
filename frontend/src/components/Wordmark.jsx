import { cn } from "@/lib/utils";

export function Wordmark({ className, mark = true }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/connexted-logo.png"
        alt="CONNEXTed"
        className={cn("h-8 w-auto object-contain", !mark && "h-7")}
      />
    </span>
  );
}

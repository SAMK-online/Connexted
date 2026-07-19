import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Card whose surface is grazed by a signal-tinted radial spotlight that
 * follows the cursor (21st.dev / magicui pattern). Purely decorative:
 * pointer-events pass through and nothing renders until hover.
 */
export function SpotlightCard({ className, children, spotColor = "hsl(var(--signal) / 0.09)" }) {
  const ref = useRef(null);

  function handleMouseMove(event) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn("group/spot relative overflow-hidden", className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(260px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotColor}, transparent 72%)`
        }}
      />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}

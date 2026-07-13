export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="mb-8 border-b border-border pb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="flex items-center gap-2.5 font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.02] tracking-tightest">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

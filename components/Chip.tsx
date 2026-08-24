"use client";

export function Chip({
  selected,
  onClick,
  children,
  strong,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "text-left rounded-2xl border px-4 py-3 text-[14.5px] leading-[1.45] transition-all duration-150 " +
        (selected
          ? strong
            ? "border-signal bg-signalsoft text-ink"
            : "border-keep bg-keepsoft text-keepdeep"
          : "border-line bg-surface text-ink hover:border-ink/25")
      }
    >
      {children}
    </button>
  );
}

export function Section({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-9 first:pt-2">
      <div className="flex items-baseline gap-3">
        <span className="text-[12px] font-medium text-faint tabular-nums">{step}</span>
        <h2 className="font-display text-[1.375rem] leading-tight tracking-[-0.01em]">{title}</h2>
      </div>
      {hint && <p className="mt-2 ml-7 text-[14px] text-muted">{hint}</p>}
      <div className="mt-4 ml-0 sm:ml-7">{children}</div>
    </section>
  );
}

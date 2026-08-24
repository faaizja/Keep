export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v10.2a.8.8 0 0 1-1.22.68L9 12.5l-4.78 2.88A.8.8 0 0 1 3 14.7V4.5Z"
          fill="#2F5D50"
        />
      </svg>
      <span className="font-display text-[19px] font-medium tracking-[-0.01em] text-ink">Keep</span>
    </span>
  );
}

export function LegendarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path d="M14 8L24 14V50L14 44V8Z" fill="currentColor" />
      <path d="M27 16L37 22V50L27 44.5V16Z" fill="currentColor" />
      <path d="M40 24L52 31L37 40L27 34.3L40 24Z" fill="currentColor" />
      <path d="M14 44L27 51.5L37 46L24 38.5L14 44Z" fill="currentColor" />
    </svg>
  );
}

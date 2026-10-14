/** Placeholder shown while a dashboard or admin page loads. */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-surface-high" />
        <div className="h-4 w-80 max-w-full rounded bg-surface-high" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-high" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-surface-high" />
    </div>
  );
}

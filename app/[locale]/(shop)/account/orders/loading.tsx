/* Streaming skeleton shown while the orders query runs (Next.js loading.tsx). */
export default function OrdersLoading() {
  return (
    <div>
      <div className="h-9 w-40 rounded mb-6 animate-pulse" style={{ background: "var(--bg-soft)" }} />
      <ul className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-2xl border px-5 py-4 flex items-center gap-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded animate-pulse" style={{ background: "var(--bg-soft)" }} />
              <div className="h-3 w-32 rounded animate-pulse" style={{ background: "var(--bg-soft)" }} />
            </div>
            <div className="h-5 w-16 rounded animate-pulse" style={{ background: "var(--bg-soft)" }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

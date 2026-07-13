export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect = "/", error } = await searchParams;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#111114" }}
    >
      <div className="w-full max-w-sm text-center">
        <div className="font-display text-3xl tracking-widest mb-8" style={{ color: "#f4f3f0" }}>
          TACTICAL <span style={{ color: "#d4b15e" }}>HB</span>
        </div>
        <p className="text-sm mb-8" style={{ color: "#9a978f" }}>
          This site is currently in development.
          <br />
          Enter the password to continue.
        </p>

        <form action="/api/unlock" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={redirect} />
          <input
            type="password"
            name="password"
            autoFocus
            placeholder="Password"
            className="w-full px-4 py-3 text-sm outline-none border text-center"
            style={{ background: "#1a1a1d", color: "#f4f3f0", borderColor: "#2a2a2e" }}
          />
          <button
            type="submit"
            className="font-display text-lg tracking-widest py-3"
            style={{ background: "#d4b15e", color: "#111114" }}
          >
            Enter
          </button>
        </form>

        {error && (
          <p className="text-xs mt-4" style={{ color: "#e07a5f" }}>
            Incorrect password. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}

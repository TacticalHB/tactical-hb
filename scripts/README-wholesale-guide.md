# Rebuilding the wholesale registration guide

Four steps, in order. Run them from a scratch directory — they write PNGs and
JSON beside themselves, and none of that belongs in the repository.

```bash
npm i playwright@1.49.1 && npx playwright install chromium   # once
npm run build && npx next start -p 3100                      # in another shell

node   /path/to/scripts/guide-shoot.mjs      # captures, en
SHOT_LOCALE=uk SHOT_OUT=shots-uk node /path/to/scripts/guide-shoot.mjs
node   /path/to/scripts/guide-boxes.mjs      # element positions
SHOT_LOCALE=uk node /path/to/scripts/guide-boxes.mjs
python3 /path/to/scripts/guide-annotate.py   # draws the callout rings
python3 /path/to/scripts/build-wholesale-guide.py
```

## Two things that are not optional

**A PRODUCTION BUILD, NOT `next dev`.** The dev server paints its own badge over
the bottom-left corner — an "N" disc and a red "1 Issue" pill. A guide sent to
trade customers showing a framework error indicator is worse than no guide.

**NOTHING IS EVER SUBMITTED.** Pressing "Send verification code" sends a real
one-time code through Supabase, and finishing the form creates a real `pending`
partner row. The captures stop short of both. Steps 2 and 3 of the form are
reached with a temporary override in `components/wholesale/WholesaleRegisterForm.tsx`:

```ts
const [step, setStep] = useState<"email" | "details" | "done">(() => {
  if (typeof window !== "undefined") {
    const s = new URLSearchParams(window.location.search).get("step");
    if (s === "details" || s === "done") return s;
  }
  return "email";
});
const [email, setEmail] = useState(() =>
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("email") ?? ""
    : ""
);
```

That override is for the photo shoot only. Put it in, build, capture, **take it
out again** — it must never be committed, because a `?step=done` anyone can type
is a screen that lies about what happened.

## When to rerun it

Whenever a button in the registration flow moves or is renamed. The rings are
drawn from measured element positions and the copy quotes the on-screen labels,
so both go stale together — and a guide pointing at the wrong button is the
thing this pipeline exists to prevent.

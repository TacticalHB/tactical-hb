import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

/* ---------------------------------------------------------------------------
   Teach Node what the TypeScript compiler already knows.

   Node executes TypeScript directly, which is why these tests need no
   framework and no build step. Two things it does NOT do are compiler
   concerns that the source is written against:

     · the "@/" path alias from tsconfig
     · extensionless specifiers — `./hmd-options` rather than `./hmd-options.ts`

   Without both, only modules whose imports happen to be relative AND extended
   are loadable, which is a handful of them and the wrong half. This resolves
   the alias against the project root and appends the real extension when a
   specifier has none, and then hands back to Node.

   `server-only` IS STUBBED, and that is not a way around the marker. The
   package exists to break a CLIENT bundle that imports a server module — its
   server entry point is an empty file and does nothing at runtime. A test in
   Node is not a client bundle, so importing it proves nothing either way; it
   simply fails to resolve at all, because pnpm keeps it as a transitive
   dependency of next rather than at the top of node_modules. Stubbing it lets
   a test reach the pure half of a server module. It does NOT let one call
   anything that touches the database or the network: those still need real
   credentials and still fail loudly, which is the protection that matters.
--------------------------------------------------------------------------- */

const root = path.resolve(import.meta.dirname, "..");
const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

/** The file a specifier means, or null to leave it to Node. */
function locate(specifier, parentURL) {
  /* NOTHING INSIDE node_modules IS OURS TO RESOLVE. This hook exists for the
     project's own TypeScript, where imports are extensionless and aliased. A
     dependency's imports are already valid for whatever module system it ships
     — and a CommonJS one resolves through a path, not a URL, so handing it the
     file:// href this returns makes it fail to find a file that is right
     there. Latent until a test first pulled in a CJS package (Resend's
     webhook verifier), which is exactly the kind of bug a narrow hook avoids
     by never being asked the question. */
  if (parentURL?.includes("/node_modules/")) return null;

  let base;
  if (specifier.startsWith("@/")) {
    base = path.join(root, specifier.slice(2));
  } else if (specifier.startsWith(".") && parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(parentURL)), specifier);
  } else {
    return null;
  }

  if (path.extname(base) && fs.existsSync(base)) return base;
  for (const ext of EXTS) if (fs.existsSync(base + ext)) return base + ext;
  /* A directory import resolves to its index, the way the compiler reads it. */
  for (const ext of EXTS) {
    const idx = path.join(base, `index${ext}`);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

/* An empty module, expressed as a data: URL so there is no file to keep. */
const EMPTY_MODULE = "data:text/javascript,export{}";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only" || specifier === "client-only") {
      return { url: EMPTY_MODULE, shortCircuit: true };
    }
    const found = locate(specifier, context.parentURL);
    return found ? next(pathToFileURL(found).href, context) : next(specifier, context);
  },
});

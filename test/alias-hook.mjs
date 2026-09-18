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
--------------------------------------------------------------------------- */

const root = path.resolve(import.meta.dirname, "..");
const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

/** The file a specifier means, or null to leave it to Node. */
function locate(specifier, parentURL) {
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

registerHooks({
  resolve(specifier, context, next) {
    const found = locate(specifier, context.parentURL);
    return found ? next(pathToFileURL(found).href, context) : next(specifier, context);
  },
});

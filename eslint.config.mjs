import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /* Agent scratch space, and it holds whole COPIES of this repo: a git
       worktree here is a second checkout, so every file in the project gets
       linted twice and the report is mostly a duplicate of itself. It reported
       9,766 problems against a project that has 22.

       Not source, not built, not shipped — and a stale worktree can sit at a
       commit from weeks ago, so its findings are not even about code that
       still exists. */
    ".claude/**",
    // Staged for deletion; not part of the build.
    "_to_delete/**",
  ]),
]);

export default eslintConfig;

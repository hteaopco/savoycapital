import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moved the connection URL out of `schema.prisma`: `datasource.url` is
 * no longer accepted there, migrate reads it from this file, and the runtime
 * client takes a driver adapter instead (see `src/lib/db.ts`).
 *
 * **`process.env.DATABASE_URL` rather than Prisma's `env()` helper, on purpose.**
 * This file is loaded by every Prisma CLI command, `prisma generate` included —
 * and `generate` runs in `postinstall`, which means it runs in CI, where **no
 * secrets are set at all**. The helper treats a missing variable as an error;
 * a plain read yields `undefined`, which the `Datasource` type permits and
 * which `generate` does not need. Codegen therefore succeeds with no database
 * anywhere in sight, and only the commands that genuinely need a connection —
 * `migrate deploy`, `db push` — fail without one, which is correct.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL },
});

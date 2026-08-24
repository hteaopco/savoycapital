import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The Postgres client (owner, 2026-08-24 — "Add a database").
 *
 * ## Lazy, for the same reason `src/lib/r2.ts` is lazy
 *
 * CI runs `next build` with **no secrets set**, deliberately, so that a fork PR
 * cannot leak them and so a change that makes the build need one is visible.
 * Constructing a client at module scope against an absent `DATABASE_URL` is
 * exactly such a change. `getDb()` returns `null` when unconfigured and the
 * routes answer 503, so a deploy without the variable serves every other page
 * normally instead of 500ing the whole app.
 *
 * ## Prisma 7 needs a driver adapter
 *
 * `datasource.url` was removed from `schema.prisma` in this major. Migrate
 * reads the URL from `prisma.config.ts`; the runtime client takes a `PrismaPg`
 * adapter built here. That split is what lets `prisma generate` run in
 * `postinstall` with no database reachable.
 *
 * ## The global cache is for `next dev`, not for production
 *
 * Next's dev server re-evaluates modules on every edit. Without a global handle
 * each reload would open a fresh pool and the old ones would linger until
 * Postgres started refusing connections. Guarded to non-production so a serverless
 * cold start never reuses a socket across an instance boundary.
 */

const globalForDb = globalThis as unknown as { savoyDb?: PrismaClient };

let cached: PrismaClient | null = globalForDb.savoyDb ?? null;

export function getDb(): PrismaClient | null {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  cached = client;
  if (process.env.NODE_ENV !== "production") globalForDb.savoyDb = client;

  return client;
}

/** The fund every deal belongs to today (owner: "every deal id right now = fundid 1"). */
export const DEFAULT_FUND_ID = 1;

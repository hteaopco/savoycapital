#!/usr/bin/env bash
# Railway's start command (railway.json -> deploy.startCommand).
#
# A script rather than an inline one-liner because the inline version needed
# nested quoting — sh -c 'if [ -n "$DATABASE_URL" ]; ...' — whose survival
# depends on how the platform execs the string. That is a silly thing to bet a
# deploy on.
set -euo pipefail

# Migrations run HERE, at boot, not at build: the database is on Railway's
# private network (postgres.railway.internal), which build containers cannot
# reach. There is no other moment that has both the schema and a route to the
# database.
#
# GUARDED on DATABASE_URL, and that guard is load-bearing. Ungated, a deploy
# without the variable fails `migrate deploy`, fails the healthcheck, and takes
# the PUBLIC LANDING PAGE down over a database it does not use. With the guard,
# a missing variable degrades to "the Deal Room says it is not configured" and
# every other page serves.
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[start] DATABASE_URL present — applying migrations"
  # NOT tolerated on failure. A half-migrated schema serving traffic is worse
  # than a failed deploy: `set -e` stops here and Railway keeps the last good
  # container running.
  npx prisma migrate deploy
else
  echo "[start] DATABASE_URL absent — skipping migrations; deal routes will answer 503"
fi

exec npm run start

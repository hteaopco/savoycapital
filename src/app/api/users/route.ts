import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

/**
 * The roster — list and create.
 *
 * `GET`  → every user, with the fund they sit on.
 * `POST` → one user: `{ firstName, lastName, phone, fundId, role }`.
 *
 * ## What this route does NOT do, said once and plainly
 *
 * **It does not create an account, send an invitation, or grant access.** A row
 * here is a record the owner keeps. Signing in still requires a Clerk account,
 * which still requires an invitation from the Clerk Dashboard, because the
 * instance is set to restricted sign-up — and that setting, not this table, is
 * the access boundary (`PLAYBOOKS/auth-clerk.md` § 1).
 *
 * The same is true in reverse: `DELETE` removes a row and revokes nothing. The
 * Clerk account outlives it.
 *
 * `role` is stored and read by nothing. It mirrors `Audience` so the eventual
 * authorization layer has a column to read, and until that layer exists a
 * MANAGEMENT row and an INVESTOR row have exactly the same power: whatever their
 * Clerk account has, which is everything.
 *
 * Protected by being absent from `src/proxy.ts`'s public list, with an explicit
 * `auth()` assertion here because this route returns people's phone numbers.
 */

export const dynamic = "force-dynamic";

const ROLES = ["MANAGEMENT", "INVESTOR"] as const;
type Role = (typeof ROLES)[number];

function unconfigured() {
  return NextResponse.json(
    { error: "The database is not configured. Set DATABASE_URL." },
    { status: 503 },
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) return unconfigured();

  const users = await db.user.findMany({
    orderBy: [{ fundId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    include: { fund: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      role: u.role,
      fundId: u.fundId,
      fundName: u.fund.name,
    })),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) return unconfigured();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (k: string) => (typeof body?.[k] === "string" ? (body[k] as string).trim() : "");

  const firstName = str("firstName");
  const lastName = str("lastName");
  const phone = str("phone");
  const role = str("role") as Role;
  const fundId = Number(body?.fundId);

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "A first and last name are both required." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "A phone number is required." }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Pick a role." }, { status: 400 });
  }
  if (!Number.isInteger(fundId) || fundId < 1) {
    return NextResponse.json({ error: "Pick a fund." }, { status: 400 });
  }

  // Checked rather than left to the foreign key, so the answer is "that fund
  // does not exist" instead of a constraint name.
  const fund = await db.fund.findUnique({ where: { id: fundId }, select: { id: true, name: true } });
  if (!fund) return NextResponse.json({ error: "That fund does not exist." }, { status: 400 });

  // The phone is unique. Checked first so the collision comes back as a
  // sentence naming the person it clashes with, rather than as a 500 from the
  // constraint. The insert can still race and lose — the catch below is what
  // makes that survivable rather than merely unlikely.
  const clash = await db.user.findUnique({
    where: { phone },
    select: { firstName: true, lastName: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: `That phone number is already on ${clash.firstName} ${clash.lastName}.` },
      { status: 409 },
    );
  }

  try {
    const created = await db.user.create({
      data: { firstName, lastName, phone, fundId, role, createdBy: userId },
      include: { fund: { select: { name: true } } },
    });
    return NextResponse.json(
      {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        phone: created.phone,
        role: created.role,
        fundId: created.fundId,
        fundName: created.fund.name,
      },
      { status: 201 },
    );
  } catch (e) {
    // P2002 is Prisma's unique-constraint violation. Reachable only by two
    // requests racing past the check above; without this it surfaces as a 500.
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "That phone number is already on the roster." }, { status: 409 });
    }
    throw e;
  }
}

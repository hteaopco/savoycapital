import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

/**
 * One roster row — remove it.
 *
 * **This revokes nothing.** Deleting a row deletes a record. If that person has
 * a Clerk account they keep it, and they keep whatever access it carries, which
 * today is everything behind the sign-in. Removing somebody's access is done in
 * the Clerk Dashboard, and the fact that this route cannot do it is the reason
 * the screen says so out loud.
 *
 * No PATCH. Editing a roster row is worth having and is not built; the phone is
 * the field most likely to need it, and it is also the unique one, so an edit
 * route owes the same collision handling the create route has. Delete and
 * re-add covers it until then.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "The database is not configured. Set DATABASE_URL." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await db.user.findUnique({ where: { id: rowId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.user.delete({ where: { id: rowId } });

  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

/**
 * One deal and its documents.
 *
 * Management only, by being absent from `src/proxy.ts`'s public list. Investor
 * documents are excluded from the response rather than merely unlinked: nothing
 * serves that prefix yet, so returning rows pointing at unreadable objects would
 * put a View button on the screen that cannot work.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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
  const dealId = Number(id);
  // `Number("")` is 0 and `Number("1.5")` is 1.5, so presence and integer-ness
  // are both checked rather than assumed from a successful parse.
  if (!Number.isInteger(dealId) || dealId < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      documents: {
        where: { audience: "MANAGEMENT" },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: deal.id,
    fundId: deal.fundId,
    name: deal.name,
    createdAt: deal.createdAt.toISOString(),
    documents: deal.documents.map((doc) => ({
      id: doc.id,
      key: doc.key,
      filename: doc.filename,
      description: doc.description,
      sizeBytes: doc.sizeBytes,
      contentType: doc.contentType,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
  });
}

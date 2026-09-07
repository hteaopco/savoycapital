import { NextResponse } from "next/server";
import { forbiddenMessage, getViewer, isManagement } from "@/lib/authz";
import { unreadInquiryCount } from "@/lib/inquiries";

/**
 * `GET /api/inquiries/unread` — the number behind the nav badge.
 *
 * **Management only.** It is one integer, but it is still a fact about the
 * firm's inbound pipeline and there is no reason an investor should learn it.
 * `src/proxy.ts` already requires a session for this path (it is absent from the
 * public allowlist, and the allowlist entry is exactly `/api/inquiries`, not a
 * prefix); the role check below is the second half.
 */
export async function GET() {
  const { viewer } = await getViewer();
  if (viewer.kind === "anonymous") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (viewer.kind === "unconfigured") {
    return NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 503 });
  }
  if (!isManagement(viewer)) {
    return NextResponse.json({ error: forbiddenMessage(viewer) }, { status: 403 });
  }

  return NextResponse.json({ unread: await unreadInquiryCount() });
}

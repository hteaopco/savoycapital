import { NextResponse } from "next/server";

// Railway's healthcheckPath points here (railway.json). Keep it dependency-free:
// a healthcheck that reaches into a database or a third party reports THAT
// service's health, not this one's, and turns an unrelated outage into a failed
// deploy. Add checks here only for things whose failure genuinely means this
// instance should not receive traffic.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}

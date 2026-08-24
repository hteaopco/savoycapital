import { RecentInvestments } from "@/components/RecentInvestments";
import { SiteNav } from "@/components/SiteNav";

export default function Home() {
  return (
    <main>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNav action={{ href: "/portfolio", label: "Investor Portal" }} />

      {/* ── Portfolio — the whole page, for now ─────────────────────────── */}
      <RecentInvestments />
    </main>
  );
}

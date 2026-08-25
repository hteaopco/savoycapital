"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  Lock,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { C } from "./palette";
import { centsToDollarInput, formatCents, groupDollarInput } from "@/lib/money";
import {
  CONNECTOR_MS,
  CONNECTOR_WEIGHT,
  EDGE_MS,
  EDGE_WEIGHT,
  FADE_DELAY_MS,
  FADE_MS,
} from "./panel-motion";

/**
 * Deal Room — create a deal, then upload its documents (owner, 2026-08-24).
 *
 * > "this will be a section where we upload the deal and all the information ...
 * > lets start with just the management section"
 *
 * Two surfaces in one screen: a deal list with a create form, and — once a deal
 * is open — the two upload boxes the owner sketched. Management Facing works;
 * **Investor Facing renders disabled on purpose**, because nothing serves the
 * `investors/` prefix and a box that accepts files nobody can read would look
 * like a working feature. The API refuses that audience too, so the disabled
 * state is not the only thing holding it.
 *
 * Bytes go to R2, the deal name and each description go to Postgres. Neither
 * store holds both halves, which is why the upload route writes R2 first — see
 * its header for why that order is the survivable one.
 *
 * The View button points at `/api/files/<key>`, the download route that already
 * existed. Keys start with `management/`, which is exactly what its
 * `isServableKey()` guard requires, so nothing new was needed to read a file
 * back.
 */

export type Deal = {
  id: number;
  fundId: number;
  name: string;
  /** Integer cents, or `null` until somebody sets it. */
  amountCents: number | null;
  /** `YYYY-MM-DD`, or `null`. */
  investmentDate: string | null;
  /** Which Portfolio bucket this deal joins. `null` until set. */
  instrument: Instrument | null;
  createdAt: string;
  documentCount: number;
};

/** Matches the schema's enum, and the two buckets the Portfolio chart draws. */
export type Instrument = "PRIVATE_EQUITY" | "PRIVATE_CREDIT";

/** Display names, in one place so the two screens cannot disagree. */
export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  PRIVATE_EQUITY: "Private Equity",
  PRIVATE_CREDIT: "Private Credit",
};

/** Just enough of a fund to populate the picker. */
export type FundOption = { id: number; name: string };

type DealDocument = {
  id: number;
  key: string;
  filename: string;
  description: string;
  /** `null` means the document sits at the deal's top level. */
  folder: string | null;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
};

/**
 * One file waiting to be uploaded (owner, 2026-08-24: "add a way to Upload
 * Multiple - i just did 7-8 files 1 by 1").
 *
 * Each carries its OWN description and folder, because that is the whole point:
 * eight files that all needed naming individually is what made doing them one
 * at a time painful, and a single description applied to a batch would not have
 * helped. `uid` exists because two files can share a name, so the name cannot
 * be a React key.
 */
type Staged = {
  uid: string;
  file: File;
  description: string;
  folder: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type DealDetail = Omit<Deal, "documentCount"> & {
  terms: string | null;
  fees: string | null;
  /** The investment thesis, as a paragraph. Management-facing only. */
  whyWeLikeIt: string | null;
  documents: DealDocument[];
};

/** Bytes to something a person reads. Not money, so no cents rule applies. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

const card: React.CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.bg,
};

const cardHeader: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${C.border}`,
  fontSize: 13,
  fontWeight: 800,
  color: C.text,
};

const input: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
};

const primaryButton: React.CSSProperties = {
  gap: 6,
  padding: "10px 14px",
  borderRadius: 8,
  border: `1px solid ${C.accent}`,
  background: C.accent,
  color: C.onSolid,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
};

const secondaryButton: React.CSSProperties = {
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "inherit",
  textDecoration: "none",
};

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: C.textDim,
};

function Notice({ tone, children }: { tone: "error" | "muted"; children: React.ReactNode }) {
  const error = tone === "error";
  return (
    <div
      role={error ? "alert" : undefined}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${error ? C.redBorder : C.border}`,
        background: error ? C.redBg : C.bgAlt,
        color: error ? C.red : C.textMuted,
        fontSize: 12,
      }}
    >
      {children}
    </div>
  );
}

export function DealRoom({
  initialDeals,
  funds,
  initialFundId,
}: {
  initialDeals: Deal[] | null;
  funds: FundOption[];
  initialFundId: number;
}) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals ?? []);
  const [openDeal, setOpenDeal] = useState<DealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * Which fund's investments are on screen (owner, 2026-08-24: "select the fund
   * to view investments in that fund only - default current fund").
   *
   * Defaults to the fund the server picked, which is fund 1 today. A new deal is
   * created into whatever is selected here, so creating while looking at a fund
   * cannot quietly file the deal somewhere else.
   */
  const [fundId, setFundId] = useState(initialFundId);

  // Every fetch below hangs off a user action — create, open, upload. None runs
  // from an effect, which is deliberate: the initial list arrives as a prop from
  // the server component, so there is no mount fetch and therefore no
  // `react-hooks/set-state-in-effect` violation and no loading state to render.
  /**
   * Reload for an explicit fund.
   *
   * The picker calls this with the fund it just selected rather than relying on
   * `reloadDeals`, because `setFundId` has not applied yet at that point and the
   * reload would fetch the fund being navigated away from.
   */
  const reloadDealsFor = useCallback(async (targetFundId: number) => {
    try {
      const res = await fetch(`/api/deals?fundId=${targetFundId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not load deals.");
      setDeals(body.deals);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load deals.");
    }
  }, []);

  const reloadDeals = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals?fundId=${fundId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not load deals.");
      setDeals(body.deals);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load deals.");
    }
    // `fundId` is a real dependency now that the fetch is scoped by it. Left at
    // `[]` this closes over the fund selected at mount, and every later reload
    // silently re-fetches the wrong fund — which presents as a save that did not
    // take rather than as a stale closure.
  }, [fundId]);

  const openDealById = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/deals/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not open that deal.");
      setOpenDeal(body);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that deal.");
    }
  }, []);

  if (initialDeals === null) {
    return (
      <div style={{ maxWidth: 900 }}>
        <Notice tone="error">
          The database is not configured, so deals cannot be listed or created. Set
          <code style={{ fontFamily: "inherit", fontWeight: 700 }}> DATABASE_URL </code>
          on the service. Nothing else on the portal is affected.
        </Notice>
      </div>
    );
  }

  if (openDeal) {
    return (
      <DealDetailView
        deal={openDeal}
        onBack={() => {
          setOpenDeal(null);
          void reloadDeals();
        }}
        onChanged={() => void openDealById(openDeal.id)}
      />
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: 16, maxWidth: 900 }}>
      {error ? <Notice tone="error">{error}</Notice> : null}

      <CreateDeal
        onCreated={(deal) => {
          setDeals((prev) => [deal, ...prev]);
          void openDealById(deal.id);
        }}
        onError={setError}
      />

      <div style={card}>
        <div className="flex flex-wrap items-center" style={{ ...cardHeader, gap: 10 }}>
          <span style={{ flex: 1 }}>Deals</span>
          {/*
            The fund picker. Changing it re-fetches rather than filtering an
            array already on screen: the list is scoped server-side by `fundId`,
            so a client-side filter would mean every fund's deals had been sent
            to the browser and merely hidden.

            Not an effect — the change handler fetches directly. React 19's
            `react-hooks/set-state-in-effect` would reject the effect version,
            and an event handler is what this actually is.
          */}
          <label
            className="flex items-center"
            style={{ gap: 8, fontSize: 11, fontWeight: 700, color: C.textDim }}
          >
            FUND
            <select
              value={fundId}
              onChange={(e) => {
                const next = Number(e.target.value);
                setFundId(next);
                void reloadDealsFor(next);
              }}
              style={{ ...input, width: "auto", minWidth: 170, fontSize: 12, padding: "7px 10px" }}
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {deals.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: C.textMuted }}>
            No deals yet. Create one above.
          </div>
        ) : (
          <div className="flex flex-col">
            {deals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => void openDealById(deal.id)}
                className="flex items-center justify-between text-left min-h-[44px]"
                style={{
                  gap: 12,
                  padding: "12px 16px",
                  borderTop: `1px solid ${C.border}`,
                  borderLeft: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  background: "transparent",
                  fontFamily: "inherit",
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block" style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    {deal.name}
                  </span>
                  <span
                    className="block"
                    style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}
                  >
                    Deal {deal.id} · {formatCents(deal.amountCents)}
                    {deal.investmentDate ? ` · invested ${deal.investmentDate}` : ""}
                  </span>
                </span>
                {/*
                  Flags what still needs filling, and disappears once it is
                  filled. The editor itself lives in the deal's detail view: this
                  row is a <button>, and a form control nested inside one is
                  invalid HTML that browsers resolve in their own ways.
                */}
                {deal.amountCents === null ||
                deal.investmentDate === null ||
                deal.instrument === null ? (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: `1px solid ${C.amberBorder}`,
                      background: C.amberBg,
                      color: C.amber,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      flexShrink: 0,
                    }}
                  >
                    Needs values
                  </span>
                ) : null}
                <span
                  style={{
                    fontSize: 11,
                    color: C.textMuted,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {deal.documentCount} {deal.documentCount === 1 ? "file" : "files"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateDeal({
  onCreated,
  onError,
}: {
  onCreated: (deal: Deal) => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not create the deal.");
      setName("");
      onCreated(body);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not create the deal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={card}>
      <div style={cardHeader}>Create New Deal</div>
      <div className="flex flex-col md:flex-row md:items-end" style={{ gap: 10, padding: 16 }}>
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 6 }}>
          <span style={label}>Deal name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="e.g. Westfield follow-on"
            style={input}
          />
        </div>
        <button
          onClick={() => void submit()}
          disabled={busy || !name.trim()}
          className="inline-flex items-center justify-center min-h-[44px]"
          style={{ ...primaryButton, opacity: busy || !name.trim() ? 0.5 : 1 }}
        >
          <Plus size={14} />
          {busy ? "Creating…" : "Create Deal"}
        </button>
      </div>
    </div>
  );
}

function DealDetailView({
  deal,
  onBack,
  onChanged,
}: {
  deal: DealDetail;
  onBack: () => void;
  /**
   * Re-reads the open deal. Named for what it now covers: an upload, a document
   * delete, AND a change to the investment figures. It was `onUploaded` when
   * uploading was the only thing that could change this screen; leaving that
   * name would have made it wrong at the third call site rather than the first.
   */
  onChanged: () => void;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 16, maxWidth: 900 }}>
      <button
        onClick={onBack}
        className="inline-flex items-center self-start min-h-[44px] md:min-h-0"
        style={{ ...secondaryButton, border: "none", background: "transparent", color: C.accent }}
      >
        <ArrowLeft size={14} />
        All deals
      </button>

      <div className="flex flex-col" style={{ gap: 2 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{deal.name}</div>
        <div style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>
          Deal {deal.id} · Fund {deal.fundId} · created {formatDate(deal.createdAt)}
        </div>
      </div>

      <DealFigures deal={deal} onSaved={onChanged} />

      <UploadBox deal={deal} onUploaded={onChanged} />

      <div style={{ ...card, background: C.bgAlt }}>
        <div className="flex items-center" style={{ ...cardHeader, gap: 8, color: C.textMuted }}>
          <Lock size={14} />
          Upload Investor Facing
        </div>
        <div style={{ padding: 16, fontSize: 12, color: C.textMuted }}>
          Not available yet. Investor access needs an authorization layer that does not
          exist — today every signed-in user sees everything, so a file uploaded here
          would be readable by nobody and appear to be readable by investors.
        </div>
      </div>
    </div>
  );
}

/**
 * The Management Facing card: a collapsible upload area, then the deal's
 * documents grouped into folders.
 *
 * The header collapses the FORM only, never the document list (owner,
 * 2026-08-24: "give Upload Management Facing a drop down chevron, that i can
 * collapse if needed"). The reason to collapse it is that the drop zone plus
 * per-file rows push the documents down the page — hiding the documents too
 * would defeat the thing being asked for. Open by default: "if needed" is not
 * "usually".
 */

/**
 * "Why We Like It" — the investment thesis, on a line off the Investment card's
 * right edge (owner, 2026-08-24: *"lets add a 'Why We Like It' modal to the
 * right of the deal info card ... have another line coming off the card to the
 * right with a modal just like the investment info. it will be a paragraph in
 * the investments section"*).
 *
 * Same vocabulary as `FundAllocation`'s holding panel — connector, edge sweep,
 * crossfade — because the owner asked for "just like the investment info" and
 * two connected panels that animate differently read as two mechanisms. The
 * motion lives in `panel-motion.ts` so they cannot drift; the GEOMETRY below is
 * this screen's own and shares nothing with that one.
 *
 * ## The breakpoint is a RESULT, not a choice
 *
 * Re-done from the Deal Room's widths, which are NOT the Portfolio's — this
 * card is 900 wide where that one is 780, so this panel needs more room and
 * floats later:
 *
 *   240 sidebar + 64 shell padding + 900 card + 72 gap + 320 panel = 1596
 *
 * `min-[1640px]:` clears that with 44px to spare. **Change any of the five and
 * re-do the sum** — the failure is a panel hanging off the right edge, and it
 * is invisible at every width except the one where it happens.
 *
 * Below the breakpoint it drops inline into the card and the connector is
 * hidden. A floating panel running off the side of the screen is worse than one
 * that stacks, and at ≤767px inline is the only thing that could work.
 *
 * The connector starts at the card's own right border — unlike the Portfolio's,
 * which starts 26px out because its row ends short of the card. Nothing to push
 * past here, so the gap and the panel's offset are the same 72.
 *
 * All three geometry values are written out as full Tailwind classes rather
 * than assembled from constants. Tailwind scans source text: a class built from
 * a variable looks tidier and silently never reaches the stylesheet.
 *   line   `min-[1640px]:left-full` `min-[1640px]:w-[72px]`
 *   panel  `min-[1640px]:left-[calc(100%+72px)]` `min-[1640px]:w-[320px]`
 */
function WhyWeLikeItPanel({
  value,
  onChange,
  fieldId,
}: {
  value: string;
  onChange: (next: string) => void;
  fieldId: string;
}) {
  const [revealed, setRevealed] = useState(false);

  // One frame of un-revealed paint is what gives the transition something to
  // move from. Setting this in render, or in a bare effect, lands in the same
  // frame and the sweep never plays.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const sweep: React.CSSProperties = {
    background: C.accent,
    transformOrigin: "left center",
    transform: revealed ? "scaleX(1)" : "scaleX(0)",
  };

  return (
    <>
      <div
        aria-hidden
        className="hidden min-[1640px]:block min-[1640px]:left-full min-[1640px]:w-[72px]"
        style={{
          ...sweep,
          height: CONNECTOR_WEIGHT,
          position: "absolute",
          top: "50%",
          transition: `transform ${CONNECTOR_MS}ms ease-out`,
        }}
      />

      <div
        className="min-[1640px]:absolute min-[1640px]:top-1/2 min-[1640px]:-translate-y-1/2 min-[1640px]:z-10 min-[1640px]:w-[320px] min-[1640px]:left-[calc(100%+72px)]"
        style={{
          // 12 = card/panel on `DESIGN_SYSTEM.md` § 2's radius scale, which
          // supersedes AP § 3's "10 cards / 12 modals" (owner, 2026-08-24).
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          background: C.bg,
          boxShadow: C.shadowSm,
          overflow: "hidden",
          opacity: revealed ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-out ${FADE_DELAY_MS}ms`,
        }}
      >
        <div
          aria-hidden
          style={{
            ...sweep,
            height: EDGE_WEIGHT,
            transition: `transform ${EDGE_MS}ms ease-out`,
          }}
        />

        <label
          htmlFor={fieldId}
          className="flex items-center"
          style={{
            gap: 10,
            padding: "10px 12px",
            borderBottom: `1px solid ${C.border}`,
            fontSize: 12,
            fontWeight: 800,
            color: C.text,
          }}
        >
          Why We Like It
        </label>

        <div style={{ padding: 12 }}>
          {/*
            A textarea, not a text input: this is the one field on the screen
            that is prose, and a single-line box that scrolls sideways is how a
            paragraph gets written as a sentence. Four rows is roughly what the
            panel shows without scrolling at 320px wide; it grows a scrollbar
            rather than the card, so opening the thesis cannot move the fields
            beside it.
          */}
          <textarea
            id={fieldId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="The thesis, in a paragraph. Why this deal, why now, and what has to be true."
            style={{
              ...input,
              lineHeight: 1.6,
              resize: "vertical",
            }}
          />
        </div>
      </div>
    </>
  );
}

/**
 * A deal's investment size and date.
 *
 * **Opens by default when either is missing** (owner, 2026-08-24: "can you make
 * it to where i can backfill the values on first load"). The deal that existed
 * before these columns has neither, so opening it puts the empty fields in front
 * of you rather than behind a chevron. Once both are set it collapses to a
 * summary — at that point the figures are worth reading and the inputs are not.
 *
 * Deliberately here and not on the list row: that row is a `<button>`, and a
 * form control nested inside one is invalid HTML that browsers resolve in their
 * own ways. The row flags what is missing; this edits it.
 */
function DealFigures({ deal, onSaved }: { deal: DealDetail; onSaved: () => void }) {
  // The instrument is part of "needs values" because the Portfolio chart cannot
  // plot a deal without one — an amount with no bucket has no arc to join.
  const needsBackfill =
    deal.amountCents === null || deal.investmentDate === null || deal.instrument === null;
  const [open, setOpen] = useState(needsBackfill);
  const [amount, setAmount] = useState(centsToDollarInput(deal.amountCents));
  const [date, setDate] = useState(deal.investmentDate ?? "");
  const [instrument, setInstrument] = useState<Instrument | "">(deal.instrument ?? "");
  const [terms, setTerms] = useState(deal.terms ?? "");
  const [fees, setFees] = useState(deal.fees ?? "");
  const [why, setWhy] = useState(deal.whyWeLikeIt ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountId = useId();
  const dateId = useId();
  const instrumentId = useId();
  const termsId = useId();
  const feesId = useId();
  const whyId = useId();

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Both keys always sent: the route treats an absent key as "leave
        // alone" and an empty string as "clear", so the form says exactly what
        // it shows rather than blanking the field it did not touch.
        // The panel beside the card is part of THIS form, not a second one.
        // Two Save buttons on one card is how half a deal gets saved.
        body: JSON.stringify({
          amountCents: amount,
          investmentDate: date,
          instrument,
          terms,
          fees,
          whyWeLikeIt: why,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not save.");
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    // `relative` is what the connected panel positions against. Nothing else on
    // this card is absolutely positioned, so this establishes the context for
    // exactly one child.
    <div style={{ ...card, position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center min-h-[44px] md:min-h-0"
        style={{
          ...cardHeader,
          gap: 8,
          width: "100%",
          border: "none",
          borderBottom: open ? `1px solid ${C.border}` : "none",
          background: "transparent",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <ChevronDown
          size={14}
          color={C.textMuted}
          style={{
            flexShrink: 0,
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 160ms ease",
          }}
        />
        <span style={{ flex: 1 }}>Investment</span>
        {!open ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.textMuted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCents(deal.amountCents)}
            {deal.instrument ? ` · ${INSTRUMENT_LABEL[deal.instrument]}` : ""}
            {deal.investmentDate ? ` · ${deal.investmentDate}` : ""}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="flex flex-col" style={{ gap: 12, padding: 16 }}>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-col md:w-[200px]" style={{ gap: 6 }}>
              <label htmlFor={amountId} style={label}>
                Investment size
              </label>
              {/*
                A text input with a numeric inputMode, which the design gate
                requires for money: a spinner control can be scrolled or arrowed
                into a different figure by a stray gesture over a focused field.
              */}
              <input
                id={amountId}
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                // Grouped on blur, not on every keystroke. Reformatting mid-word
                // moves the caret, so live grouping makes typing a long figure
                // feel possessed; `groupDollarInput` leaves anything it cannot
                // parse exactly as entered.
                onBlur={(e) => setAmount(groupDollarInput(e.target.value))}
                placeholder="1,500,000"
                style={{ ...input, fontVariantNumeric: "tabular-nums" }}
              />
            </div>
            <div className="flex flex-col md:w-[200px]" style={{ gap: 6 }}>
              <label htmlFor={dateId} style={label}>
                Investment date
              </label>
              <input
                id={dateId}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={input}
              />
            </div>
            <div className="flex flex-col md:w-[190px]" style={{ gap: 6 }}>
              <label htmlFor={instrumentId} style={label}>
                Instrument
              </label>
              {/*
                This is what puts the deal in a Portfolio bucket. Without it the
                chart has no arc to add the amount to, so the deal is listed as
                not shown rather than plotted somewhere plausible.
              */}
              <select
                id={instrumentId}
                value={instrument}
                onChange={(e) => setInstrument(e.target.value as Instrument | "")}
                style={input}
              >
                <option value="">— Not set —</option>
                {(Object.keys(INSTRUMENT_LABEL) as Instrument[]).map((i) => (
                  <option key={i} value={i}>
                    {INSTRUMENT_LABEL[i]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/*
            Free text, and shown in the Portfolio drill-down exactly as typed.
            What a position actually holds — rate, term, amortisation for debt;
            ownership and basis for equity — is still the decision blocked on a
            person, so these stay prose rather than a schema that would have to
            be undone.
          */}
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 6 }}>
              <label htmlFor={termsId} style={label}>
                Terms
              </label>
              <input
                id={termsId}
                type="text"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="10% Rate, 1 Yr Balloon / 10 Yr Amort"
                style={input}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 6 }}>
              <label htmlFor={feesId} style={label}>
                Fees
              </label>
              <input
                id={feesId}
                type="text"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="1% fee on funding, 1% on renewal"
                style={input}
              />
            </div>
          </div>

          {/*
            Rendered here so that BELOW the float breakpoint it stacks in a
            sensible reading order — the figures, then the thesis, then Save.
            Above it, the panel is absolutely positioned and this spot in the
            DOM stops mattering.

            Mounted only while the section is open, so the sweep replays on each
            open rather than firing once for the life of the page.
          */}
          <WhyWeLikeItPanel value={why} onChange={setWhy} fieldId={whyId} />

          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
              style={{ ...primaryButton, opacity: busy ? 0.5 : 1 }}
            >
              {busy ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Dollars, stored as cents. Clearing a field removes the value. These
              figures are what the Portfolio chart draws.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UploadBox({ deal, onUploaded }: { deal: DealDetail; onUploaded: () => void }) {
  const [formOpen, setFormOpen] = useState(true);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderListId = useId();

  /** Folder names already used in this deal, offered so picking beats typing. */
  const knownFolders = Array.from(
    new Set(deal.documents.map((d) => d.folder).filter((f): f is string => !!f)),
  ).sort();

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setStaged((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        uid: crypto.randomUUID(),
        file,
        // Seeded from the filename with its extension dropped — for a file
        // called "PG - Stu Stover.pdf" that is already the description, and an
        // edit beats typing from nothing. Still fully editable.
        description: file.name.replace(/\.[^.]+$/, ""),
        folder: "",
        status: "pending" as const,
      })),
    ]);
    setError(null);
  };

  const patch = (uid: string, changes: Partial<Staged>) =>
    setStaged((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...changes } : s)));

  /**
   * Upload the queue ONE REQUEST AT A TIME, and keep going past a failure.
   *
   * Sequential rather than parallel: eight concurrent multipart posts is a
   * self-inflicted thundering herd against one container, and the per-file
   * status only means something if the requests resolve in a knowable order.
   *
   * Past a failure rather than stopping: a batch that aborts on file three
   * leaves the owner guessing which of eight landed. Here every row ends up
   * either done or carrying its own reason, and only the failures remain
   * staged to retry.
   */
  const uploadAll = async () => {
    const queue = staged.filter((s) => s.status !== "done");
    if (!queue.length || busy) return;
    if (queue.some((s) => !s.description.trim())) {
      setError("Every file needs a description.");
      return;
    }

    setBusy(true);
    setError(null);
    let failures = 0;

    for (const item of queue) {
      patch(item.uid, { status: "uploading", error: undefined });
      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("description", item.description.trim());
        if (item.folder.trim()) form.append("folder", item.folder.trim());

        const res = await fetch(`/api/deals/${deal.id}/documents`, {
          method: "POST",
          body: form,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Upload failed.");
        patch(item.uid, { status: "done" });
      } catch (e) {
        failures += 1;
        patch(item.uid, {
          status: "error",
          error: e instanceof Error ? e.message : "Upload failed.",
        });
      }
    }

    // Clear what succeeded; leave what failed so it can be retried in place.
    setStaged((prev) => prev.filter((s) => s.status !== "done"));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (failures) setError(`${failures} of ${queue.length} did not upload. See each row.`);
    setBusy(false);
    onUploaded();
  };

  const pending = staged.filter((s) => s.status !== "done").length;

  return (
    <div style={card}>
      <button
        onClick={() => setFormOpen((v) => !v)}
        aria-expanded={formOpen}
        className="flex items-center min-h-[44px] md:min-h-0"
        style={{
          ...cardHeader,
          gap: 8,
          width: "100%",
          border: "none",
          borderBottom: `1px solid ${C.border}`,
          background: "transparent",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <ChevronDown
          size={14}
          color={C.textMuted}
          style={{
            flexShrink: 0,
            transform: formOpen ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 160ms ease",
          }}
        />
        <Upload size={14} color={C.accent} />
        <span style={{ flex: 1 }}>Upload Management Facing</span>
        {!formOpen && pending > 0 ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
            {pending} staged
          </span>
        ) : null}
      </button>

      {formOpen ? (
        <div className="flex flex-col" style={{ gap: 12, padding: 16 }}>
          {error ? <Notice tone="error">{error}</Notice> : null}

          {/* Drop target. Also a real <input type="file"> behind a label, because
              a drop zone alone is unreachable from a keyboard and unusable on a
              phone, where there is nothing to drag from. `multiple` on both
              paths — the drop handler takes the whole FileList now, not [0]. */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center text-center"
            style={{
              gap: 6,
              padding: "28px 16px",
              borderRadius: 10,
              border: `1px dashed ${dragging ? C.accent : C.borderStrong}`,
              background: dragging ? C.accentBg : C.bgAlt,
              transition: "background 160ms ease, border-color 160ms ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xls,.xlsx,.csv,application/pdf"
              onChange={(e) => addFiles(e.target.files)}
              style={{ display: "none" }}
            />
            <FileText size={20} color={C.textDim} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              Drag PDF or Excel files here
            </span>
            <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>
              or click to choose · several at once · 25MB each
            </span>
          </label>

          {/* One row per staged file: its own description and folder, because
              naming eight files individually is the thing that made doing them
              one at a time painful. */}
          {staged.length > 0 ? (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {staged.map((item) => (
                <div
                  key={item.uid}
                  className="flex flex-col"
                  style={{
                    gap: 8,
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${item.status === "error" ? C.redBorder : C.border}`,
                    background: item.status === "error" ? C.redBg : C.bgAlt,
                  }}
                >
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <FileText size={14} color={C.textDim} style={{ flexShrink: 0 }} />
                    <span
                      className="min-w-0 flex-1"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.file.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                        flexShrink: 0,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {item.status === "uploading"
                        ? "Uploading…"
                        : formatSize(item.file.size)}
                    </span>
                    <button
                      onClick={() =>
                        setStaged((prev) => prev.filter((s) => s.uid !== item.uid))
                      }
                      disabled={busy}
                      aria-label={`Remove ${item.file.name}`}
                      className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
                      style={{
                        width: 28,
                        flexShrink: 0,
                        border: "none",
                        background: "transparent",
                        color: C.textMuted,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row" style={{ gap: 8 }}>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => patch(item.uid, { description: e.target.value })}
                      placeholder="What is this document?"
                      disabled={busy}
                      style={{ ...input, flex: 2 }}
                    />
                    <input
                      type="text"
                      list={folderListId}
                      value={item.folder}
                      onChange={(e) => patch(item.uid, { folder: e.target.value })}
                      placeholder="Folder (optional)"
                      disabled={busy}
                      style={{ ...input, flex: 1 }}
                    />
                  </div>

                  {item.error ? (
                    <span style={{ fontSize: 11, color: C.red }}>{item.error}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Existing folder names, offered to every folder input above and to
              the move control on each document row. One list, so a deal cannot
              grow two spellings of the same folder through the UI. */}
          <datalist id={folderListId}>
            {knownFolders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>

          <button
            onClick={() => void uploadAll()}
            disabled={busy || pending === 0}
            className="inline-flex items-center justify-center self-start min-h-[44px]"
            style={{ ...primaryButton, opacity: busy || pending === 0 ? 0.5 : 1 }}
          >
            <Upload size={14} />
            {busy
              ? "Uploading…"
              : pending > 1
                ? `Upload ${pending} files`
                : "Upload"}
          </button>
        </div>
      ) : null}

      <DocumentList deal={deal} folderListId={folderListId} onChanged={onUploaded} />
    </div>
  );
}

/**
 * A deal's documents, grouped into folders (owner, 2026-08-24: "add a folder
 * that i can collapse files into ... this would keep the main files easily
 * visible, and the foldered files expandable so i can see them if need be").
 *
 * Folders render first and CLOSED; ungrouped documents follow, always visible.
 * Collapsed, a folder costs one row, so putting them first follows the
 * file-browser convention without pushing the loose files down — which is the
 * thing the owner actually asked to protect. Flip the two blocks to reverse it.
 */
function DocumentList({
  deal,
  folderListId,
  onChanged,
}: {
  deal: DealDetail;
  folderListId: string;
  onChanged: () => void;
}) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  if (deal.documents.length === 0) return null;

  const loose = deal.documents.filter((d) => !d.folder);
  const folders = new Map<string, DealDocument[]>();
  for (const doc of deal.documents) {
    if (!doc.folder) continue;
    const bucket = folders.get(doc.folder);
    if (bucket) bucket.push(doc);
    else folders.set(doc.folder, [doc]);
  }
  const folderNames = Array.from(folders.keys()).sort();

  const toggle = (name: string) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="flex flex-col">
      {folderNames.map((name) => {
        const isOpen = openFolders.has(name);
        const contents = folders.get(name)!;
        return (
          <div key={name} className="flex flex-col">
            <button
              onClick={() => toggle(name)}
              aria-expanded={isOpen}
              className="flex items-center min-h-[44px] md:min-h-0"
              style={{
                gap: 8,
                width: "100%",
                padding: "12px 16px",
                border: "none",
                borderTop: `1px solid ${C.border}`,
                background: isOpen ? C.bgAlt : "transparent",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "background 160ms ease",
              }}
            >
              <ChevronDown
                size={14}
                color={C.textMuted}
                style={{
                  flexShrink: 0,
                  transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 160ms ease",
                }}
              />
              {isOpen ? (
                <FolderOpen size={15} color={C.accent} />
              ) : (
                <Folder size={15} color={C.accent} />
              )}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>
                {name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {contents.length}
              </span>
            </button>

            {isOpen
              ? contents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    deal={deal}
                    folderListId={folderListId}
                    onChanged={onChanged}
                    indented
                  />
                ))
              : null}
          </div>
        );
      })}

      {loose.map((doc) => (
        <DocumentRow
          key={doc.id}
          doc={doc}
          deal={deal}
          folderListId={folderListId}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

/**
 * One document. View downloads it; the folder control moves it.
 *
 * The move control exists because folders arrived AFTER documents did — there
 * were ten files sitting in this deal the day it was asked for. A grouping
 * feature you can only apply to files that do not exist yet is one you have to
 * re-upload to use.
 */
function DocumentRow({
  doc,
  deal,
  folderListId,
  onChanged,
  indented = false,
}: {
  doc: DealDocument;
  deal: DealDetail;
  folderListId: string;
  onChanged: () => void;
  indented?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(doc.folder ?? "");
  const [busy, setBusy] = useState(false);
  /**
   * Delete asks first (owner, 2026-08-24). Two clicks rather than a `confirm()`
   * dialog: the design system has no vocabulary for a browser confirm, and this
   * removes a fund document and its bytes — a misclick beside "View" should not
   * be able to do that. The confirm state is per-row, so arming one row does not
   * arm the others.
   */
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (busy) return;
    const next = value.trim() || null;
    if (next === (doc.folder ?? null)) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: next }),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      onChanged();
    } catch {
      // Left in the editing state with the typed value intact: a move that
      // silently reverted would read as the folder name being rejected.
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${deal.id}/documents/${doc.id}`, {
        method: "DELETE",
      });
      // 204 has no body, so there is nothing to parse and nothing to read a
      // message out of — the status is the whole answer.
      if (!res.ok) throw new Error("Delete failed.");
      setConfirming(false);
      onChanged();
    } catch {
      setError("Could not delete. Try again.");
      setDeleting(false);
    }
    // Deliberately not clearing `deleting` on success: the row is about to be
    // unmounted by the refresh, and re-enabling the button first invites a
    // second DELETE against an id that is already gone.
  };

  return (
    /*
      `flex-wrap` so the actions drop to their own line on a phone.
      The three controls plus the row's padding are ~256px of fixed width; a
      375px viewport leaves the row ~333px, so the description was being squeezed
      to ~77px — ~53px on an indented row — and wrapping into a narrow column.
      Nothing tore (the description carries `min-w-0 flex-1`), which is why this
      is an ergonomics fix rather than a breakage one.

      Desktop is untouched: the card is up to 900px wide, everything fits on one
      line, and a flex row only wraps when it must. The action group below takes
      `w-full` under `md:` and `md:w-auto` above it, so the split is deterministic
      on a phone rather than depending on how long a filename happens to be.
    */
    <div
      className="flex flex-wrap items-center justify-between"
      style={{
        gap: 12,
        padding: "12px 16px",
        paddingLeft: indented ? 40 : 16,
        borderTop: `1px solid ${C.border}`,
        background: indented ? C.bgAlt : "transparent",
      }}
    >
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{doc.description}</div>
        {editing ? (
          <div className="flex items-center" style={{ gap: 6, marginTop: 6 }}>
            <input
              type="text"
              list={folderListId}
              value={value}
              autoFocus
              disabled={busy}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
                if (e.key === "Escape") {
                  setValue(doc.folder ?? "");
                  setEditing(false);
                }
              }}
              placeholder="Folder name — blank for top level"
              style={{ ...input, padding: "6px 10px", fontSize: 12 }}
            />
            <button
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center min-h-[44px] md:min-h-0"
              style={{ ...secondaryButton, flexShrink: 0 }}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <div
            style={{
              fontSize: 11,
              color: error ? C.red : C.textMuted,
              fontVariantNumeric: "tabular-nums",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {error
              ? error
              : `${doc.filename} · ${formatSize(doc.sizeBytes)} · ${formatDate(doc.uploadedAt)}`}
          </div>
        )}
      </div>

      {confirming ? (
        // Armed. The other actions are replaced rather than sitting alongside,
        // so the row asks one question and "Delete?" cannot be answered by
        // clicking something else.
        <div
          className="flex w-full items-center justify-end md:w-auto"
          style={{ gap: 6, flexShrink: 0 }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: C.red }}>Delete?</span>
          <button
            onClick={() => void remove()}
            disabled={deleting}
            className="inline-flex items-center min-h-[44px] md:min-h-0"
            style={{
              ...secondaryButton,
              border: `1px solid ${C.redBorder}`,
              background: C.redBg,
              color: C.red,
            }}
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={deleting}
            className="inline-flex items-center min-h-[44px] md:min-h-0"
            style={{ ...secondaryButton }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div
          className="flex w-full items-center justify-end md:w-auto"
          style={{ gap: 6 }}
        >
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              aria-label={doc.folder ? `Move ${doc.description} out of ${doc.folder}` : `Move ${doc.description} to a folder`}
              className="inline-flex items-center min-h-[44px] md:min-h-0"
              style={{ ...secondaryButton, flexShrink: 0, color: C.textMuted }}
            >
              <Folder size={13} />
              {doc.folder ?? "Folder"}
            </button>
          ) : null}

          {/* A plain link, not a fetch: the download route answers with an
              attachment disposition, so the browser saves the file and the
              page does not navigate away. */}
          <a
            href={`/api/files/${doc.key}`}
            className="inline-flex items-center min-h-[44px] md:min-h-0"
            style={{ ...secondaryButton, flexShrink: 0 }}
          >
            <Eye size={13} />
            View
          </a>

          {/* Neutral until armed. A destructive control that is already red
              before it has been asked for reads as a warning about the row
              rather than about the action. */}
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${doc.description}`}
            className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
            style={{
              ...secondaryButton,
              flexShrink: 0,
              padding: "8px 10px",
              color: C.textMuted,
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

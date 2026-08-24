"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft, Eye, FileText, Lock, Plus, Upload } from "lucide-react";
import { C } from "./palette";

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
  createdAt: string;
  documentCount: number;
};

type DealDocument = {
  id: number;
  key: string;
  filename: string;
  description: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
};

type DealDetail = Omit<Deal, "documentCount"> & { documents: DealDocument[] };

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

export function DealRoom({ initialDeals }: { initialDeals: Deal[] | null }) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals ?? []);
  const [openDeal, setOpenDeal] = useState<DealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Every fetch below hangs off a user action — create, open, upload. None runs
  // from an effect, which is deliberate: the initial list arrives as a prop from
  // the server component, so there is no mount fetch and therefore no
  // `react-hooks/set-state-in-effect` violation and no loading state to render.
  const reloadDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not load deals.");
      setDeals(body.deals);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load deals.");
    }
  }, []);

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
        onUploaded={() => void openDealById(openDeal.id)}
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
        <div style={cardHeader}>Deals</div>
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
                    Deal {deal.id} · Fund {deal.fundId} · {formatDate(deal.createdAt)}
                  </span>
                </span>
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
  onUploaded,
}: {
  deal: DealDetail;
  onBack: () => void;
  onUploaded: () => void;
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

      <UploadBox deal={deal} onUploaded={onUploaded} />

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

function UploadBox({ deal, onUploaded }: { deal: DealDetail; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    if (!file || !description.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("description", description.trim());
      const res = await fetch(`/api/deals/${deal.id}/documents`, { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Upload failed.");
      setFile(null);
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={card}>
      <div className="flex items-center" style={{ ...cardHeader, gap: 8 }}>
        <Upload size={14} color={C.accent} />
        Upload Management Facing
      </div>

      <div className="flex flex-col" style={{ gap: 12, padding: 16 }}>
        {error ? <Notice tone="error">{error}</Notice> : null}

        {/* Drop target. Also a real <input type="file"> behind a label, because a
            drop zone alone is unreachable from a keyboard and unusable on a phone,
            where there is nothing to drag from. */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) setFile(dropped);
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
            accept=".pdf,.xls,.xlsx,.csv,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
          />
          <FileText size={20} color={C.textDim} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {file ? file.name : "Drag a PDF or Excel file here"}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>
            {file ? formatSize(file.size) : "or click to choose · 25MB max"}
          </span>
        </label>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span style={label}>Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void upload();
            }}
            placeholder="What is this document?"
            style={input}
          />
        </div>

        <button
          onClick={() => void upload()}
          disabled={busy || !file || !description.trim()}
          className="inline-flex items-center justify-center self-start min-h-[44px]"
          style={{
            ...primaryButton,
            opacity: busy || !file || !description.trim() ? 0.5 : 1,
          }}
        >
          <Upload size={14} />
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>

      {deal.documents.length > 0 ? (
        <div className="flex flex-col">
          {deal.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between"
              style={{ gap: 12, padding: "12px 16px", borderTop: `1px solid ${C.border}` }}
            >
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {doc.description}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.textMuted,
                    fontVariantNumeric: "tabular-nums",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.filename} · {formatSize(doc.sizeBytes)} · {formatDate(doc.uploadedAt)}
                </div>
              </div>
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
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

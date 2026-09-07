"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, Phone, Trash2 } from "lucide-react";
import { C } from "./palette";
import { eyebrow } from "./type";

/**
 * Cold Reach — the inbound enquiry list.
 *
 * ## Everything on this screen is untrusted text
 *
 * A stranger typed it. It is rendered as text through JSX, which escapes, and
 * nothing here is put anywhere that executes — no `dangerouslySetInnerHTML`, no
 * `href` built from a field except the two below, both scheme-prefixed
 * (`mailto:` / `tel:`) so a submitted `javascript:` cannot become the scheme.
 * **Keep it that way.** This is the only screen in the product fed by the
 * public internet.
 *
 * ## Unread is the whole interaction
 *
 * `readAt === null` is what the nav badge counts. Opening a row marks it read,
 * which is the only way the badge clears — so the badge cannot drift from the
 * list. `router.refresh()` after every mutation re-runs the server component
 * and the shell's own count fetch, rather than this component keeping a second
 * copy of the truth.
 *
 * Delete is immediate and permanent (owner, 2026-09-07). It is behind a
 * confirm, because the row is the only record of someone's approach and there
 * is no undo — the API deletes the R2 objects too.
 */

export type Submission = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
  files: { id: number; key: string; filename: string; sizeBytes: number }[];
};

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

export function ColdReach({ submissions }: { submissions: Submission[] | null }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function open(row: Submission) {
    const next = openId === row.id ? null : row.id;
    setOpenId(next);
    // Marking read on OPEN rather than on arrival: the badge should mean
    // "nobody has looked at this", and rendering a list is not looking.
    if (next !== null && row.readAt === null) {
      await fetch(`/api/inquiries/${row.id}`, { method: "PATCH" }).catch(() => {});
      router.refresh();
    }
  }

  async function remove(row: Submission) {
    if (!window.confirm(`Delete the enquiry from ${row.firstName} ${row.lastName}? This cannot be undone.`)) {
      return;
    }
    setBusy(row.id);
    const response = await fetch(`/api/inquiries/${row.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (response?.ok) {
      if (openId === row.id) setOpenId(null);
      router.refresh();
    } else {
      window.alert("Could not delete that enquiry. Please try again.");
    }
  }

  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Cold Reach</div>

        {submissions === null ? (
          <Empty>
            The database is not configured, so enquiries cannot be listed. This is a
            deploy setting, not an empty inbox.
          </Empty>
        ) : submissions.length === 0 ? (
          <Empty>Nothing yet. Enquiries from the public contact form land here.</Empty>
        ) : (
          <div
            className="flex flex-col"
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: C.bg,
              overflow: "hidden",
            }}
          >
            {submissions.map((row, i) => {
              const isOpen = openId === row.id;
              const unread = row.readAt === null;
              return (
                <div
                  key={row.id}
                  style={{ borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}
                >
                  <button
                    onClick={() => open(row)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center min-h-[44px] md:min-h-0"
                    style={{
                      gap: 12,
                      padding: "12px 14px",
                      border: "none",
                      background: isOpen ? C.bgAlt : "transparent",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    {/* An unread marker, not a colour-only signal: § 7 forbids
                        those, so the name also goes bold and the dot carries an
                        accessible label. */}
                    <span
                      aria-label={unread ? "Unread" : undefined}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        flexShrink: 0,
                        background: unread ? C.red : "transparent",
                      }}
                    />
                    <span
                      className="min-w-0"
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: unread ? 800 : 600,
                        color: C.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.firstName} {row.lastName}
                      {row.company ? (
                        <span style={{ fontWeight: 500, color: C.textMuted }}>
                          {" — "}
                          {row.company}
                        </span>
                      ) : null}
                    </span>
                    {row.files.length ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.textDim,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.files.length} file{row.files.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    <span
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtDate(row.createdAt)}
                    </span>
                  </button>

                  {isOpen ? (
                    <div
                      style={{
                        padding: "4px 14px 16px 34px",
                        background: C.bgAlt,
                      }}
                    >
                      <div className="flex flex-wrap items-center" style={{ gap: 16 }}>
                        <a
                          href={`mailto:${encodeURIComponent(row.email)}`}
                          className="inline-flex items-center min-h-[44px] md:min-h-0"
                          style={{ gap: 6, fontSize: 13, fontWeight: 600, color: C.accent, textDecoration: "none" }}
                        >
                          <Mail size={14} />
                          {row.email}
                        </a>
                        {row.phone ? (
                          <a
                            href={`tel:${encodeURIComponent(row.phone)}`}
                            className="inline-flex items-center min-h-[44px] md:min-h-0"
                            style={{ gap: 6, fontSize: 13, fontWeight: 600, color: C.accent, textDecoration: "none" }}
                          >
                            <Phone size={14} />
                            {row.phone}
                          </a>
                        ) : null}
                      </div>

                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: C.text,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {row.message}
                      </p>

                      {row.files.length ? (
                        <div className="mt-4 flex flex-col gap-2">
                          <div style={{ ...eyebrow, color: C.textDim }}>Attachments</div>
                          {row.files.map((file) => (
                            <a
                              key={file.id}
                              href={`/api/files/${file.key}`}
                              className="inline-flex items-center self-start min-h-[44px] md:min-h-0"
                              style={{ gap: 6, fontSize: 13, fontWeight: 600, color: C.accent, textDecoration: "none" }}
                            >
                              <Download size={14} />
                              {file.filename}
                              <span style={{ color: C.textDim, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                                {(file.sizeBytes / 1024).toFixed(0)} KB
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : null}

                      <button
                        onClick={() => remove(row)}
                        disabled={busy === row.id}
                        className="mt-5 inline-flex items-center min-h-[44px] md:min-h-0"
                        style={{
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: `1px solid ${C.redBorder}`,
                          background: C.redBg,
                          color: C.red,
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "inherit",
                          opacity: busy === row.id ? 0.6 : 1,
                        }}
                      >
                        <Trash2 size={13} />
                        {busy === row.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 720,
        padding: 24,
        borderRadius: 10,
        border: `1px dashed ${C.borderStrong}`,
        background: C.bgAlt,
        color: C.textMuted,
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { C } from "./palette";
import { HONEYPOT_FIELD, MAX_FILES } from "@/lib/inquiry-fields";

/**
 * The public contact form.
 *
 * ## It replaced a `mailto:`, and the spec's objection was answered rather than
 * overruled
 *
 * The 2026-09-06 build spec said **do not build a contact form**, because "a
 * form implies inbox monitoring that does not exist yet, and an unanswered form
 * is worse than no form." The owner reversed that on 2026-09-07 — and reversed
 * it correctly, because the same instruction created the monitoring: submissions
 * land under Admin as **Cold Reach** with a red badge on the nav. The objection
 * was never to forms, it was to unwatched ones.
 *
 * **So the badge is not decoration; it is the thing that makes this form
 * honest.** If it is ever removed, this form should go back to being a mailto.
 * A ClickSend SMS now fires too (`src/lib/sms.ts`), but it is best-effort and
 * silent without the ClickSend credentials — the badge is the signal that does
 * not depend on a secret being set. Resend email is still to come.
 *
 * ## Client component, and why the whole page is not one
 *
 * File inputs and inline validation need state, so this island is a client
 * component. Everything else on the landing page stays a server component —
 * the hero, the grid and the criteria are static and there is no reason for
 * them to ship JavaScript.
 *
 * ## Submitting
 *
 * Multipart `POST` to `/api/inquiries`, which is public in `src/proxy.ts`.
 * Field errors come back per-field; anything else is one message. On success
 * the form is replaced rather than cleared — a cleared form invites a second
 * submission, and this reads as "we have it".
 */

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: C.text,
};

const field: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  color: C.text,
  fontSize: 15,
  // `DESIGN_SYSTEM.md` § 4: never a hardcoded font-family on a control, or it
  // falls back to the browser's and stops matching the page.
  fontFamily: "inherit",
};

export function ContactForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)].slice(0, MAX_FILES));
    // Reset the input so re-picking the same file still fires a change event.
    if (fileInput.current) fileInput.current.value = "";
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setErrors({});
    setFormError(null);

    const body = new FormData(event.currentTarget);
    // The <input type="file"> is not inside the form's own data because the
    // list is held in state — append what the person actually kept.
    body.delete("files");
    for (const file of files) body.append("files", file);

    try {
      const response = await fetch("/api/inquiries", { method: "POST", body });
      if (response.ok) {
        setState("sent");
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        errors?: { field: string; message: string }[];
      } | null;

      if (payload?.errors) {
        setErrors(Object.fromEntries(payload.errors.map((e) => [e.field, e.message])));
      } else {
        setFormError(payload?.error ?? "Something went wrong. Please try again.");
      }
      setState("idle");
    } catch {
      setFormError("We could not reach the server. Please try again.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div
        className="mt-8 max-w-[560px]"
        style={{
          padding: "20px 22px",
          borderRadius: 12,
          border: `1px solid ${C.greenBorder}`,
          background: C.greenBg,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>
          Thank you — we have it.
        </div>
        <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, color: C.text }}>
          Someone will read this and come back to you directly.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-[640px]" noValidate>
      {/* The honeypot: hidden from people, filled by bots. `tabIndex={-1}` and
          `autoComplete="off"` keep it out of the way of anyone using a keyboard
          or a password manager. It is positioned off-screen rather than
          `display: none`, which some bots skip. */}
      <div aria-hidden style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input id={HONEYPOT_FIELD} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field name="firstName" label="First name" error={errors.firstName} required autoComplete="given-name" />
        <Field name="lastName" label="Last name" error={errors.lastName} required autoComplete="family-name" />
        <Field name="email" label="Email" type="email" error={errors.email} required autoComplete="email" />
        <Field name="phone" label="Phone" type="tel" error={errors.phone} autoComplete="tel" />
      </div>

      <div className="mt-5">
        <Field name="company" label="Your company" error={errors.company} autoComplete="organization" />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="message" style={label}>
          Tell us about the opportunity
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          style={{ ...field, resize: "vertical", lineHeight: 1.6 }}
        />
        {errors.message ? <FieldError>{errors.message}</FieldError> : null}
      </div>

      {/* Attachments. A real <input type="file"> kept off-screen and driven by
          a styled button — the native control cannot be themed to the palette,
          and replacing it outright would lose keyboard and screen-reader
          behaviour that comes free. */}
      <div className="mt-6 flex flex-col gap-3">
        <input
          ref={fileInput}
          id="files"
          name="files"
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="inline-flex items-center self-start min-h-[44px]"
          style={{
            gap: 8,
            padding: "9px 16px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
            color: C.text,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          <Paperclip size={15} />
          Upload files
        </button>

        {files.length ? (
          <ul className="flex flex-col gap-2" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between"
                style={{
                  gap: 12,
                  padding: "8px 10px 8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.bgAlt,
                }}
              >
                <span
                  className="min-w-0"
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: C.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.textMuted,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {(file.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((c) => c.filter((_, n) => n !== i))}
                  aria-label={`Remove ${file.name}`}
                  className="inline-flex items-center justify-center min-h-[44px] md:min-h-0"
                  style={{ width: 32, border: "none", background: "transparent", color: C.textMuted }}
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {formError ? (
        <div
          className="mt-6"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${C.redBorder}`,
            background: C.redBg,
            color: C.red,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-8 inline-flex items-center min-h-[44px]"
        style={{
          gap: 8,
          padding: "11px 22px",
          borderRadius: 8,
          border: "none",
          background: C.accent,
          color: C.onSolid,
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "inherit",
          opacity: state === "sending" ? 0.7 : 1,
        }}
      >
        {state === "sending" ? "Sending…" : "Send"}
      </button>

    </form>
  );
}

function Field({
  name,
  label: text,
  type = "text",
  error,
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} style={label}>
        {text}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        style={{
          ...field,
          borderColor: error ? C.redBorder : C.border,
        }}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: C.red }}>{children}</div>;
}

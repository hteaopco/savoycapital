import "server-only";
import { managementPhones } from "./clerk-users";

/**
 * ClickSend SMS — outbound alerts only.
 *
 * Built from the owner's handoff notes (2026-09-07, carried from theAPlink),
 * with three deliberate departures recorded below. `CLICKSEND_USERNAME` and
 * `CLICKSEND_API_KEY` are provisioned in Railway; nothing here reads a
 * credential from anywhere else.
 *
 * **Recipients come from the Clerk roster, not from a literal** — this instance
 * signs people in by phone, so the number is already there and verified. See
 * `alertRecipients()`. There is no phone number written in this repository.
 *
 * ## Lazy and optional, like `getDb()` and `getR2()`
 *
 * CI builds with **no secrets at all**. Absent credentials or an absent
 * recipient list make every send a silent no-op returning `false` — never a
 * throw, never a build-time requirement. `CLAUDE.md`: a change that makes the
 * build need a secret is a change worth noticing, and this is not one.
 *
 * ## The GSM-7 cost trap — the reason `smsSafe` exists
 *
 * SMS bills per segment. A GSM-7 segment is 160 characters; **one character
 * outside that alphabet silently switches the whole message to UCS-2, where a
 * segment is 70.** A single curly quote or middle dot triples the cost of the
 * same text. This cost theAPlink real money before it was caught. `smsSafe()`
 * runs at compose time AND again inside `sendSms`, so no caller can bypass it.
 *
 * ## Departure 1 — the body carries NO user-supplied text
 *
 * theAPlink puts a sender's first name and a deal label in the message. Its
 * names come from authenticated users. **Ours come from strangers**: this
 * module is fed by `POST /api/inquiries`, the only unauthenticated write in
 * the product. A "first name" of `URGENT call 555-0100` would arrive in the
 * owners' text messages looking like it came from Savoy. So the alert is a
 * pure pointer — fixed text, zero interpolation — and the who and the what
 * live behind the auth boundary in Cold Reach. This also makes it exactly one
 * segment, forever.
 *
 * ## Departure 2 — no quiet hours
 *
 * theAPlink holds alerts overnight and drops them. A cold inbound arrives a
 * few times a month here and the owner asked to be told, so holding is the
 * wrong default. If that ever changes, § 8 of the handoff has the logic worth
 * copying — the wrap-midnight case (`19 → 8` is not a range check) and the
 * fixed-timezone hour.
 *
 * ## Departure 3 — a global send cap
 *
 * theAPlink's alerts are triggered by signed-in users. Ours are triggered by
 * the public internet, so a spam run that gets past the honeypot spends money
 * one text at a time. `withinSendBudget()` bounds that. Same honest limits as
 * `rateLimit` in `inquiries.ts`: one process, resets on deploy.
 *
 * ## What this does NOT do (§ 9 of the handoff, unchanged)
 *
 * No delivery receipts — `true` means ClickSend accepted the message, not that
 * a handset got it. No inbound SMS, no webhook, no retry, no suppression list.
 * That last one is a compliance gap for anything customer-facing; it is fine
 * here only because the sole recipients are the two owners of the firm, texting
 * themselves about their own inbox.
 */

const ENDPOINT = "https://rest.clicksend.com/v3/sms/send";

/** Long enough for a slow API, short enough not to hold a form submission. */
const TIMEOUT_MS = 4_000;

/** Backstop slice inside `sendSms`, per the handoff. */
const MAX_BODY_CHARS = 320;

/**
 * E.164 from a stored or typed US number. `null` when unusable.
 *
 * Returning `null` rather than throwing is the point: an unreadable number
 * should make the send a no-op, not an exception in a request path.
 *
 * US-only as written, which is true of both recipients.
 */
export function toDialable(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let digits = String(raw).replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

/**
 * Force a string into GSM-7-safe printable ASCII.
 *
 * The characters that bite: `·` `•` curly quotes, en/em dashes, `…`, emoji,
 * and accented letters — that last one being the one that catches people,
 * because it arrives in user data rather than in a template.
 */
export function smsSafe(s: string): string {
  return s
    .replace(/[·•]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type ClickSendConfig = { username: string; apiKey: string; source: string };

function getConfig(): ClickSendConfig | null {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;
  if (!username || !apiKey) return null;
  return { username, apiKey, source: process.env.CLICKSEND_SOURCE || "savoycapital" };
}

/**
 * The `SMS_ALERT_TO` **override**, comma-separated. Empty when unset, which is
 * the normal case — see `alertRecipients()` for where numbers actually come
 * from.
 *
 * It exists for the one case the roster cannot express: alerting a number that
 * is not somebody's sign-in identity. Nothing sets it today.
 */
export function smsRecipients(): string[] {
  const raw = process.env.SMS_ALERT_TO;
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const dialable = toDialable(part);
    if (dialable) seen.add(dialable);
  }
  return [...seen];
}

/**
 * Best-effort per-process send budget.
 *
 * Stated honestly, the way `rateLimit` is: this lives in one process's memory,
 * so a horizontal scale-out multiplies it and a deploy resets it. It bounds the
 * cost of a spam run on one instance. It is not a spend control.
 */
const BUDGET_WINDOW_MS = 60 * 60 * 1000;
const BUDGET_MAX = 20;
const sent: number[] = [];

function withinSendBudget(): boolean {
  const now = Date.now();
  while (sent.length && now - sent[0] >= BUDGET_WINDOW_MS) sent.shift();
  if (sent.length >= BUDGET_MAX) return false;
  sent.push(now);
  return true;
}

/**
 * Send one message. **Never throws.** Missing credentials, an unusable number,
 * an API error, a network failure, a timeout — all return `false` and warn.
 *
 * Callers treat this as fire-and-forget: the enquiry row and the Cold Reach
 * badge are created regardless of whether the text lands.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const dialable = toDialable(to);
  if (!dialable) {
    console.warn("[sms] unusable recipient, skipping");
    return false;
  }

  // The second application of the guard. A caller that composed carelessly
  // cannot make this a three-segment message from here.
  const text = smsSafe(body).slice(0, MAX_BODY_CHARS);
  if (!text) return false;

  if (!withinSendBudget()) {
    console.warn("[sms] hourly send budget spent, dropping alert");
    return false;
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        // HTTP Basic — username and API key as user:pass. NOT a bearer token.
        Authorization: `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ source: config.source, to: dialable, body: text }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // **A 200 does not mean the message was accepted.** ClickSend returns an
    // envelope; the verdict is `response_code`. And it can answer with a
    // non-JSON error page, on which `res.json()` throws — so read text first
    // and parse inside a try.
    const raw = await response.text().catch(() => "");
    let parsed: { response_code?: string } | null = null;
    try {
      parsed = raw ? (JSON.parse(raw) as { response_code?: string }) : null;
    } catch {
      parsed = null;
    }

    const ok = response.ok && parsed?.response_code === "SUCCESS";
    if (!ok) console.warn(`[sms] send rejected (http ${response.status})`);
    return ok;
  } catch {
    // Includes the timeout. Deliberately swallowed: see the contract above.
    console.warn("[sms] send failed");
    return false;
  }
}

/**
 * The alert itself: a fixed pointer, no interpolation. See "Departure 1".
 *
 * Composed through `smsSafe` even though every character is already ASCII —
 * the guard belongs at compose time as well as at send time, and a future edit
 * to this string is exactly where a curly apostrophe would sneak in.
 */
export const NEW_INQUIRY_SMS = smsSafe(
  "New Savoy Capital enquiry. Open Cold Reach in the portal to read it.",
);

/**
 * Who gets alerted: **the Clerk roster, not a constant.**
 *
 * The owner offered to hardcode his number and then asked whether Clerk already
 * had it (2026-09-07). It does — this instance signs people in BY phone
 * (`PLAYBOOKS/auth-clerk.md` GOTCHA 9), so every account carries a verified one
 * by construction. `managementPhones()` reads it live. **No phone number is
 * written anywhere in this repository**, adding the second principal is a role
 * assignment rather than a deploy, and a number that changes has to change in
 * Clerk anyway or its owner cannot sign in.
 *
 * `SMS_ALERT_TO` wins when set, for a recipient who is not a sign-in identity.
 */
export async function alertRecipients(): Promise<string[]> {
  const override = smsRecipients();
  return override.length ? override : managementPhones();
}

/**
 * Tell the owners an enquiry arrived. Fire-and-forget by contract.
 *
 * One HTTP call per recipient, which the handoff notes is not the efficient
 * shape at scale. There are two recipients. If that ever becomes dozens, put
 * them in a single `messages[]` array instead.
 */
export async function notifyNewInquiry(): Promise<void> {
  const recipients = await alertRecipients();
  if (!recipients.length) return;
  await Promise.all(recipients.map((to) => sendSms(to, NEW_INQUIRY_SMS)));
}

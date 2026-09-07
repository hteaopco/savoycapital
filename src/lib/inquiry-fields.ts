/**
 * The handful of contact-form constants BOTH sides need.
 *
 * ## Why this file exists at all
 *
 * `src/lib/inquiries.ts` is `server-only`, so the client form cannot import
 * from it. Without this module the honeypot's field name would be written once
 * in the form and once in the route — two constants that must agree, in two
 * files, with nothing connecting them. The day they drift the form silently
 * stops being spam-protected and nothing fails: the route reads a field the
 * form no longer sends, finds it empty, and waves everything through.
 *
 * That is the "two screens that disagree" failure `ui-governance.md` § 3 names,
 * and no lint reaches it. One module is the fix.
 *
 * **Nothing secret goes here.** It ships to the browser.
 */

/**
 * The honeypot: hidden from people, filled by bots. Named `website` because it
 * is a plausible field for a form to have — `honeypot` would announce itself.
 */
export const HONEYPOT_FIELD = "website";

/** Mirrored in the route's own caps; here so the form can stop a person early. */
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

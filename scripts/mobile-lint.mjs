#!/usr/bin/env node
/**
 * mobile-lint — the gate on the ≤767px surface.
 *
 * WHY IT EXISTS
 *
 * theAPlink accumulated 87 unadapted tables because every feature added one and
 * nothing required a mobile answer in the same PR. That is a PROCESS gap, not a
 * design one, which is why a periodic sweep never fixed it for long. This gate
 * makes the cost immediate and small instead of deferred and pooled — and it is
 * cheap to adopt here precisely because this repo has not accumulated the debt
 * yet. `design/MOBILE_REFERENCE.md` § 8 is the spec; this is the implementation.
 *
 * WHAT THIS PROVES, AND WHAT IT DOES NOT
 *
 * It proves a MECHANISM IS PRESENT: that a control states a touch floor, that a
 * table arrived with a mobile answer, that a hard `minWidth` is gated. It cannot
 * prove GEOMETRY. A control's real hit area is CSS + layout + content, so a
 * `min-h-[44px]` that loses to a conflicting inline `height` passes this gate and
 * is still wrong — `.claude/rules/ui-governance.md` § 6 says exactly that, and it
 * stays true. The residue is a person at 375px, and `design/MOBILE_AUDIT_PLAYBOOK.md`
 * § 3 is the rubric. A green run means mobile is not getting WORSE. It does not
 * mean mobile is DONE.
 *
 * THE BASELINE IS `{}` AND STAYS `{}`
 *
 * Every rule sits at zero, so the next violation fails the build. A genuine
 * exception is waived AT THE CALL SITE with a reason:
 *
 *     // mobile-ok: spaced secondary control on § 0.8's 36px carve-out
 *
 * Never re-grow the baseline to make a red build green. If a rule is wrong, fix
 * the rule and its fixture — "the lint can't see X" is a bug report, not a waiver.
 *
 * Usage:
 *   node scripts/mobile-lint.mjs             # gate — exits 1 on any violation
 *   node scripts/mobile-lint.mjs --report    # per-rule counts, always exits 0
 *   node scripts/mobile-lint.mjs --self-test # assert every rule still fires
 *   node scripts/mobile-lint.mjs --update    # rewrite the baseline (after FIXING)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskComments } from "./lib/mask-comments.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BASELINE_PATH = join(ROOT, "scripts", "mobile-lint-baseline.json");

/** Same generous window as design-lint, and for the same reason: theAPlink
 *  shipped five bogus waivers because a six-line window missed the real ones. */
const WAIVER_LOOKBACK = 12;

/** The touch floor. 44, not theAPlink's 40 — `DESIGN_SYSTEM.md` § 0.8 / § 9, and
 *  `design/MOBILE_REFERENCE.md`'s divergence banner records why 40 did not carry. */
const FLOOR = 44;

/** Elements that are unambiguously CONTROLS, so a missing floor is a real finding.
 *
 *  Deliberately NOT "any element with onClick". A clickable `<div>` wrapping a
 *  whole card is a legitimate large tap target and a regex cannot tell it from a
 *  6px one — `.claude/rules/ui-governance.md` § 6 names that as the reason a
 *  tap-target rule cannot be complete. Scoping to real controls keeps every
 *  finding true, which is worth more than catching every case. */
const CONTROL_TAGS = new Set(["button", "a", "Link"]);

/** A hard `minWidth` at or above this cannot fit a 375px phone once the shell's
 *  padding and a card's border are taken out (measured: ~297px of usable width).
 *
 *  `minWidth` ONLY, deliberately — not `width`. A numeric `width` collides with
 *  `next/image` intrinsic dimensions (`width: 520` in `RecentInvestments`'s data
 *  is an image's real size, not a layout constraint), and a rule that fires on
 *  honest code teaches people that waivers are for false positives. `maxWidth` is
 *  inherently safe on a phone and is not checked. */
const WIDTH_LIMIT = 300;

// ── rules ────────────────────────────────────────────────────────────────────
//
// Same contract as design-lint: each rule gets the path, the comment-MASKED text
// (so this file's own prose, and a docblock explaining a rule, never fire) and
// the ORIGINAL text (so a waiver written in a comment is still findable).

const rules = [
  {
    id: "tap-target",
    why:
      `A <button>/<a>/<Link> must state a ${FLOOR}px touch floor — ` +
      "`min-h-[44px] md:min-h-0`. globals.css floors FORM CONTROLS only; buttons " +
      "are excluded there so § 0.8's 36px carve-out survives, which means they " +
      "carry it at the call site or nothing floors them.",
    scan: ({ masked }) =>
      openingTags(masked).filter(
        (t) =>
          (CONTROL_TAGS.has(t.name) || /role\s*=\s*["']button["']/.test(t.text)) &&
          !hasFloor(t.text),
      ),
    waivable: true,
  },
  {
    id: "fixed-width",
    why:
      `An inline minWidth >= ${WIDTH_LIMIT} cannot fit a 375px phone (~297px of ` +
      "usable width). Use a flex basis, a percentage, or gate it behind `md:`.",
    scan: ({ masked }) =>
      matchAll(masked, /minWidth\s*:\s*(\d+)\b/g).filter(
        (m) => Number(m.groups[1]) >= WIDTH_LIMIT,
      ),
    waivable: true,
  },
  {
    id: "table-overflow",
    why:
      "A <table> with no overflow-x wrapper tears the whole PAGE sideways. This " +
      "is breakage, not an improvement — MOBILE_REFERENCE § 3's decision tree " +
      "puts it first. Wrap it: <div style={{ overflowX: 'auto' }}>.",
    scan: ({ masked }) =>
      matchAll(masked, /<table\b/g).filter(
        (m) => !/overflowX|overflow-x/.test(before(masked, m.index, 900)),
      ),
    waivable: true,
  },
  {
    id: "table-label",
    why:
      "A wide table that scrolls but whose first column scrolls away loses the " +
      "row's identity. Pin it on mobile (position:sticky,left:0 with an OPAQUE " +
      "background) or render cards instead. Scrolling is not broken, so this is " +
      "an improvement — but a new table owes one in the PR that adds it.",
    scan: ({ masked }) =>
      matchAll(masked, /<table\b/g).filter(
        (m) => !/sticky|MobileCard|md:hidden|hidden md:/.test(around(masked, m.index, 900)),
      ),
    waivable: true,
  },
  {
    id: "column-count",
    why:
      "column-count does NOT collapse on its own — a real trap, and a comment " +
      "claiming it does is a red flag (MOBILE_AUDIT_PLAYBOOK § 3A). In CSS, give " +
      "it a @media (max-width: 767px) override in the same file. In TSX there is " +
      "no fix: an INLINE style cannot honor a media query at all (the same trap " +
      "DESIGN_SYSTEM § 3.6 bans inline gridTemplateColumns for), so move it to a " +
      "Tailwind class or a stylesheet rather than waiving it.",
    css: true,
    scan: ({ masked, isCss }) =>
      isCss
        ? matchAll(masked, /column-count\s*:/g).filter(
            () => !/max-width:\s*767px/.test(masked),
          )
        : matchAll(masked, /columnCount\s*:/g),
    waivable: true,
  },
];

// ── engine ───────────────────────────────────────────────────────────────────

function matchAll(text, re) {
  const out = [];
  for (const m of text.matchAll(re)) out.push({ index: m.index, text: m[0], groups: m });
  return out;
}

const before = (t, i, n) => t.slice(Math.max(0, i - n), i);
const around = (t, i, n) => t.slice(Math.max(0, i - n), i + n);

/** Does this opening tag state the touch floor, in either idiom? */
function hasFloor(tag) {
  return (
    new RegExp(`min-h-\\[${FLOOR}px\\]`).test(tag) ||
    new RegExp(`minHeight\\s*:\\s*${FLOOR}\\b`).test(tag)
  );
}

/**
 * Every JSX opening tag, with its full text from `<` to the matching `>`.
 *
 * Resolving the ENCLOSING TAG rather than looking back a fixed number of lines
 * is the fix for theAPlink's known bug: its tap-target rule looked back six lines,
 * read a real <button> as an unfloored <div>, and five bogus waivers were written
 * to work around it. Quotes and braces are tracked so a `>` inside `onClick={() =>
 * x}` or inside an attribute string does not end the tag early.
 */
function openingTags(text) {
  const out = [];
  for (const m of text.matchAll(/<([A-Za-z][A-Za-z0-9.]*)/g)) {
    const start = m.index;
    let i = start + m[0].length;
    let depth = 0, quote = null;
    while (i < text.length) {
      const c = text[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth <= 0) break;
      i++;
    }
    out.push({ index: start, name: m[1], text: text.slice(start, i + 1) });
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** A `mobile-ok:` with a reason, within WAIVER_LOOKBACK lines above the hit. */
function isWaived(original, line) {
  const lines = original.split("\n");
  for (let i = Math.max(0, line - 1 - WAIVER_LOOKBACK); i < line; i++) {
    const m = /mobile-ok:\s*(\S.*)/.exec(lines[i] ?? "");
    if (m && m[1].trim().length > 3) return true;
  }
  return false;
}

/** Run every applicable rule over one file's text. Pure — the self-test uses it. */
export function runRules({ path, text }) {
  const isCss = path.endsWith(".css");
  const masked = maskComments(text);
  const findings = [];
  for (const rule of rules) {
    if (isCss && !rule.css) continue;
    for (const hit of rule.scan({ path, masked, original: text, isCss })) {
      const line = lineOf(text, hit.index);
      if (rule.waivable && isWaived(text, line)) continue;
      findings.push({ rule: rule.id, path, line, text: hit.text.trim().slice(0, 80) });
    }
  }
  return findings;
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function scanRepo() {
  const findings = [];
  for (const full of walk(join(ROOT, "src"))) {
    const path = relative(ROOT, full).split(sep).join("/");
    findings.push(...runRules({ path, text: readFileSync(full, "utf8") }));
  }
  return findings;
}

// ── self-test ────────────────────────────────────────────────────────────────
//
// A gate with a broken regex reads green forever, which is worse than no gate.
// Every rule gets a case that MUST fire and a case that MUST stay silent.

const FIXTURES = [
  ["tap-target", "src/x.tsx", '<button onClick={go}>Save</button>',
    '<button className="min-h-[44px] md:min-h-0" onClick={go}>Save</button>'],
  ["tap-target", "src/x.tsx", '<a href="/x">View</a>',
    '<a href="/x" className="inline-flex min-h-[44px] md:min-h-0">View</a>'],
  ["tap-target", "src/x.tsx", '<div role="button" onClick={go} />',
    '<div role="button" onClick={go} style={{ minHeight: 44 }} />'],
  ["tap-target", "src/x.tsx", '<button style={{ height: 22 }}>x</button>',
    '// mobile-ok: spaced secondary control on § 0.8\'s 36px carve-out\n<button style={{ height: 22 }}>x</button>'],
  // The enclosing-tag resolver: a `>` inside an arrow function must not end the tag.
  ["tap-target", "src/x.tsx", '<button onClick={() => go(1)}>x</button>',
    '<button onClick={() => go(1)} className="min-h-[44px]">x</button>'],
  ["fixed-width", "src/x.tsx", 'const s = { minWidth: 340 };', 'const s = { minWidth: 280 };'],
  ["fixed-width", "src/x.tsx", 'const s = { minWidth: 300 };', 'const s = { maxWidth: 900 };'],
  ["table-overflow", "src/x.tsx", '<table><tbody /></table>',
    '<div style={{ overflowX: "auto" }}><table><tbody /></table></div>'],
  ["table-label", "src/x.tsx", '<div style={{ overflowX: "auto" }}><table /></div>',
    '<div style={{ overflowX: "auto" }}><td style={{ position: "sticky", left: 0 }} /><table /></div>'],
  // TSX: an inline columnCount can never respond to a breakpoint, so there is no
  // "clean" inline form — the clean case is not writing it inline at all.
  ["column-count", "src/x.tsx", 'const s = { columnCount: 2 };', '<div className="columns-1 md:columns-2" />'],
  ["column-count", "src/x.css", '.a { column-count: 2 }', '.a { column-count: 2 } @media (max-width: 767px) { .a { column-count: 1 } }'],
  // next/image intrinsic dimensions are NOT layout — fixed-width must stay quiet.
  ["fixed-width", "src/x.tsx", 'const s = { minWidth: 520 };', 'const img = { width: 520, height: 360 };'],
  // The masker: prose describing a rule must never trip it.
  ["fixed-width", "src/x.tsx", 'const s = { minWidth: 400 };', '// never write minWidth: 400 in a component\nconst s = {};'],
  // The masker, after an INTERPOLATED TEMPLATE LITERAL. This is the case that
  // was broken: the closing backtick used to open a phantom string, leaving every
  // later comment visible, and tap-target duly fired on the words "<button>" in
  // three docblocks. Guarding it here because design-lint shares the same masker.
  ["tap-target", "src/x.tsx",
    'const s = { border: `1px solid ${C.border}` };\n<button>x</button>',
    'const s = { border: `1px solid ${C.border}` };\n// this row is a <button>, and that is prose\nconst y = 1;'],
];

function selfTest() {
  let failed = 0;
  for (const [id, path, bad, good] of FIXTURES) {
    const fires = runRules({ path, text: bad }).some((f) => f.rule === id);
    const quiet = !runRules({ path, text: good }).some((f) => f.rule === id);
    if (!fires) { console.error(`FAIL  ${id}: did not fire on  ${JSON.stringify(bad)}`); failed++; }
    if (!quiet) { console.error(`FAIL  ${id}: fired on clean   ${JSON.stringify(good)}`); failed++; }
    if (fires && quiet) console.log(`ok    ${id}  ${JSON.stringify(bad.slice(0, 46))}`);
  }
  console.log(failed === 0 ? `\nself-test: ${FIXTURES.length} cases, all pass` : `\nself-test: ${failed} FAILURES`);
  return failed === 0 ? 0 : 1;
}

// ── main ─────────────────────────────────────────────────────────────────────

const argv = new Set(process.argv.slice(2));

if (argv.has("--self-test")) process.exit(selfTest());

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const findings = scanRepo();
const counts = Object.fromEntries(rules.map((r) => [r.id, 0]));
for (const f of findings) counts[f.rule]++;

if (argv.has("--update")) {
  writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + "\n");
  console.log("baseline rewritten:", JSON.stringify(counts));
  process.exit(0);
}

if (argv.has("--report")) {
  const width = Math.max(...rules.map((r) => r.id.length));
  console.log("mobile-lint — coverage profile\n");
  for (const rule of rules) {
    console.log(`  ${rule.id.padEnd(width)}  ${String(counts[rule.id]).padStart(3)}  (baseline ${baseline[rule.id] ?? 0})`);
  }
  console.log(`\n  ${findings.length} finding(s) across ${rules.length} rules.`);
  console.log("\n  The gate covers about half of MOBILE_AUDIT_PLAYBOOK § 3. It sees nothing");
  console.log("  of clipped controls, a flex child missing minWidth:0, cards staying N-up,");
  console.log("  chip-row overflow, or long unbroken strings. Green != done.");
  process.exit(0);
}

let failed = false;
for (const rule of rules) {
  const allowed = baseline[rule.id] ?? 0;
  if (counts[rule.id] > allowed) {
    failed = true;
    console.error(`\n${rule.id}: ${counts[rule.id]} violation(s), baseline ${allowed}`);
    console.error(`  ${rule.why}`);
    for (const f of findings.filter((f) => f.rule === rule.id)) {
      console.error(`  ${f.path}:${f.line}  ${f.text}`);
    }
  }
}

if (failed) {
  console.error("\nmobile-lint FAILED. Fix it, or waive a genuine exception at the call");
  console.error("site with `// mobile-ok: <reason>`. Do not re-grow the baseline.\n");
  process.exit(1);
}

console.log(`mobile-lint clean — ${rules.length} rules, baseline {} on every one.`);

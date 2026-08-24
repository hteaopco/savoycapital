#!/usr/bin/env node
/**
 * design-lint — the gate on design fidelity.
 *
 * WHAT THIS PROVES, AND WHAT IT DOES NOT
 *
 * It proves TOKENS AND MECHANISMS: that a color came from the `C` palette, that
 * an icon came from lucide, that theming lives in a style prop and not in a
 * Tailwind class. It cannot prove VALUES. `C.overlay` used as a shadow passes
 * every rule here and is still wrong. So does a 15px body size on a scale that
 * stops at 13, a card at radius 10 next to a card at radius 12, and a screen
 * that matches no exemplar. That residue is the design seat's job, and
 * `.claude/rules/ui-governance.md` names it under "not mechanically checkable"
 * so nobody mistakes a green run for a review.
 *
 * THE BASELINE IS `{}` AND STAYS `{}`
 *
 * Every rule sits at zero, so the next violation fails the build — that is the
 * whole value. A genuine exception is waived AT THE CALL SITE with a reason:
 *
 *     // design-ok: <element> is not covered by the global cursor rule
 *
 * Never re-grow the baseline to make a red build green.
 *
 * Usage:
 *   node scripts/design-lint.mjs             # gate — exits 1 on any violation
 *   node scripts/design-lint.mjs --report    # per-rule counts, always exits 0
 *   node scripts/design-lint.mjs --self-test # assert every rule still fires
 *   node scripts/design-lint.mjs --update    # rewrite the baseline (after FIXING)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskComments } from "./lib/mask-comments.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const BASELINE_PATH = join(ROOT, "scripts", "design-lint-baseline.json");

/** How far above a violation a `design-ok:` waiver may sit and still count.
 *  Generous on purpose: theAPlink shipped five bogus waivers because a six-line
 *  window silently missed the real ones and people worked around the gap. */
const WAIVER_LOOKBACK = 12;

/** The palette module is the one place a literal color is the point. */
const PALETTE = join("src", "components", "palette.ts");

/** The root layout defines the font stack the whole app then inherits. */
const FONT_ROOT = join("src", "app", "layout.tsx");

/**
 * `DESIGN_SYSTEM.md` § 2's radius scale. Note what is NOT here: **7**, which
 * `AP_DESIGN_REFERENCE.md` § 3 lists for a pill tab. That file is superseded on
 * this point (owner, 2026-08-24) and carries a banner saying so.
 *
 * There is deliberately no companion `spacing-scale` rule. § 2 lists a spacing
 * scale of 4/6/8/10/12/16/20/24, but § 3's own primitives ship `padding:
 * "10px 14px"` and `"48px 16px"` — the canon does not hold itself to that scale
 * for component-internal padding, so a rule enforcing it would fail honest code
 * and push agents to re-theme working components. Measured before writing, which
 * is why the rule does not exist.
 */
const RADIUS_SCALE = new Set([0, 4, 6, 8, 10, 12, 16, 999]);

/** `text-*` utilities that position text rather than theme it. */
const TEXT_LAYOUT = new Set([
  "text-left", "text-center", "text-right", "text-justify", "text-start",
  "text-end", "text-wrap", "text-nowrap", "text-balance", "text-pretty",
  "text-ellipsis", "text-clip",
]);

const ICON_PACKAGES =
  /^(react-icons|feather-icons|react-feather|boxicons|iconoir-react|phosphor-react)|^@(heroicons|mui\/icons-material|tabler\/icons|phosphor-icons|radix-ui\/react-icons)/;

const SHADCN_CLASSES = new Set([
  "bg-card", "bg-background", "bg-muted", "bg-popover", "bg-accent",
  "text-foreground", "text-muted-foreground", "text-popover-foreground",
  "border-border",
]);

// ── rules ────────────────────────────────────────────────────────────────────
//
// Each rule gets the file's path, its comment-MASKED text (so rule prose in a
// docblock is never read as a violation) and its ORIGINAL text (so a waiver
// written in a comment can still be found). It returns [{ line, detail }].

const rules = [
  {
    id: "raw-hex",
    why: "Every color comes from the `C` palette. AP_DESIGN_REFERENCE § 2.",
    css: true,
    scan: ({ path, masked }) =>
      path === PALETTE ? [] : matchAll(masked, /#[0-9a-fA-F]{3,8}\b/g),
  },
  {
    id: "raw-rgba",
    why: "Same as raw-hex — `C.overlay` and the shadow tokens exist for this.",
    css: true,
    scan: ({ path, masked }) =>
      path === PALETTE ? [] : matchAll(masked, /\brgba?\(/g),
  },
  {
    id: "input-number",
    why: 'DESIGN_SYSTEM § 4 — use type="text" inputMode="numeric".',
    scan: ({ masked }) => matchAll(masked, /type\s*[:=]\s*["']number["']/g),
  },
  {
    id: "foreign-icons",
    why: "lucide-react is the only icon library. DESIGN_SYSTEM § 4.",
    scan: ({ masked }) =>
      matchAll(masked, /from\s+["']([^"']+)["']/g).filter((m) =>
        ICON_PACKAGES.test(m.groups[1]),
      ),
  },
  {
    id: "inline-svg",
    why:
      "DESIGN_SYSTEM.md § 4: don't hand-roll an ICON as SVG — use lucide. Inline " +
      "SVG for a chart, logo or data visualisation is expressly allowed, and says " +
      "so at the call site with a `design-ok:` reason.",
    scan: ({ masked }) => matchAll(masked, /<svg[\s>]/g),
    waivable: true,
  },
  {
    id: "shadcn-import",
    why: "No shadcn components or class tokens. DESIGN_SYSTEM § 4.",
    scan: ({ masked }) => [
      ...matchAll(masked, /from\s+["'][^"']*components\/ui\/[^"']*["']/g),
      ...classTokens(masked).filter((t) => SHADCN_CLASSES.has(t.token)),
    ],
  },
  {
    id: "tailwind-theme",
    why:
      "Tailwind is for LAYOUT. Color, radius, shadow, weight and type size come " +
      "from the `C` palette as inline styles. AP_DESIGN_REFERENCE § 2.",
    scan: ({ masked }) =>
      classTokens(masked).filter(({ token }) => {
        if (token.startsWith("text-")) return !TEXT_LAYOUT.has(token);
        return /^(bg-|border-|rounded|shadow|ring|outline-|font-|tracking-|leading-|divide-|from-|via-|to-)/.test(
          token,
        );
      }),
  },
  {
    id: "radius-scale",
    why:
      "DESIGN_SYSTEM.md § 2 radius scale: 4 badges/pills, 6 small chips, 8 " +
      "buttons/inputs, 10 larger buttons and dashed empty cards, 12 cards/panels, " +
      "16 modal/sheet top corners, 999 circular. There is no 7 — AP_DESIGN_REFERENCE " +
      "§ 3's 6/7/8/10/12 is superseded (owner, 2026-08-24).",
    scan: ({ masked }) =>
      matchAll(masked, /borderRadius\s*:\s*("[^"]*"|[0-9]+)/g).filter(({ groups }) => {
        const raw = groups[1];
        // "50%" is the circular step spelled as a percentage — same decision as 999.
        if (raw === '"50%"') return false;
        const px = Number(raw.replace(/["px]/g, ""));
        return !RADIUS_SCALE.has(px);
      }),
    waivable: true,
  },
  {
    id: "cursor-pointer",
    why:
      "globals.css already covers button, [role=button] and a. A clickable <th>, " +
      "<tr>, <label>, <div> or SVG node genuinely needs its own and carries a " +
      "`design-ok:` reason — the regex cannot tell those apart.",
    scan: ({ masked }) => [
      ...matchAll(masked, /cursor\s*:\s*["']?pointer/g),
      ...classTokens(masked).filter((t) => t.token === "cursor-pointer"),
    ],
    waivable: true,
  },
  {
    id: "breakpoint-floor",
    why:
      "No breakpoint reaches below 768px (DECISIONS 2026-08-24). `md:` is " +
      "primary; a second is allowed above it when derived from arithmetic and " +
      "shown at the call site.",
    css: true,
    scan: ({ masked, isCss }) =>
      isCss
        ? matchAll(masked, /\(\s*(max|min)-width\s*:\s*(\d+)px\s*\)/g).filter(
            ({ groups }) => {
              const px = Number(groups[2]);
              return groups[1] === "max" ? px < 767 : px < 768;
            },
          )
        : classTokens(masked).filter((t) => t.prefixes.includes("sm")),
  },
  {
    id: "font-family-literal",
    why:
      'DESIGN_SYSTEM § 4 — always fontFamily: "inherit". The root layout is the ' +
      "one place the stack is named, because that is where the font is loaded.",
    scan: ({ path, masked }) =>
      path === FONT_ROOT
        ? []
        : matchAll(masked, /fontFamily\s*:\s*["']([^"']+)["']/g).filter(
            (m) => m.groups[1].trim() !== "inherit",
          ),
  },
];

/**
 * The mirror gate. HARD — no baseline, no waiver, no `--update`.
 *
 * `design/` is the source of truth and the app holds its own copy. Before this
 * ran, the two could diverge with nothing saying so; the whole value of the
 * folder is that the claim "same look as theAPlink" is checkable.
 *
 * `design/globals-reset-snippet.css` is deliberately NOT a pair: the app's
 * globals.css is a documented partial port (the snippet's `@apply` lines depend
 * on a shadcn token layer this app does not have) and its own header says so.
 * `design/inter-fonts.ts` has no app copy yet — no PDF module exists.
 */
const MIRRORS = [["design/palette.ts", "src/components/palette.ts"]];

// ── engine ───────────────────────────────────────────────────────────────────

function matchAll(text, re) {
  const out = [];
  for (const m of text.matchAll(re)) {
    out.push({ index: m.index, text: m[0], groups: m });
  }
  return out;
}

/**
 * Every whitespace-separated token of every `className` in the file, with its
 * responsive prefixes split off. Covers both `className="…"` and the template
 * form `className={`… ${x} …`}` — the interpolated part is unreadable statically
 * and is skipped rather than guessed at.
 */
function classTokens(text) {
  const out = [];
  const attrs = matchAll(text, /className\s*=\s*(?:"([^"]*)"|\{`([^`]*)`)/g);
  for (const attr of attrs) {
    const raw = attr.groups[1] ?? attr.groups[2] ?? "";
    const base = attr.index + attr.text.indexOf(raw);
    let offset = 0;
    for (const piece of raw.split(/(\s+)/)) {
      if (piece.trim()) {
        const parts = piece.replace(/^!/, "").split(":");
        const token = parts.pop();
        if (token && !token.startsWith("$")) {
          out.push({ index: base + offset, text: piece, token, prefixes: parts });
        }
      }
      offset += piece.length;
    }
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** A `design-ok:` with a reason, within WAIVER_LOOKBACK lines above the hit. */
function isWaived(original, line) {
  const lines = original.split("\n");
  for (let i = Math.max(0, line - 1 - WAIVER_LOOKBACK); i < line; i++) {
    const m = /design-ok:\s*(\S.*)/.exec(lines[i] ?? "");
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
      findings.push({ rule: rule.id, path, line, text: hit.text.trim() });
    }
  }
  return findings;
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function scanRepo() {
  const files = walk(join(ROOT, "src"));
  const findings = [];
  for (const full of files) {
    const path = relative(ROOT, full).split(sep).join("/");
    findings.push(...runRules({ path, text: readFileSync(full, "utf8") }));
  }
  return findings;
}

function checkMirrors() {
  const broken = [];
  for (const [a, b] of MIRRORS) {
    const left = readFileSync(join(ROOT, a), "utf8");
    const right = readFileSync(join(ROOT, b), "utf8");
    if (left !== right) broken.push([a, b]);
  }
  return broken;
}

// ── self-test ────────────────────────────────────────────────────────────────
//
// A gate with a broken regex reads green forever, which is worse than no gate.
// Every rule gets a case that MUST fire and a case that MUST stay silent.

const FIXTURES = [
  ["raw-hex", 'src/x.tsx', 'const a = { color: "#ff0000" };', 'const a = { color: C.red };'],
  ["raw-rgba", 'src/x.tsx', 'const a = { color: "rgba(0,0,0,.5)" };', 'const a = { color: C.overlay };'],
  ["input-number", 'src/x.tsx', '<input type="number" />', '<input type="text" inputMode="numeric" />'],
  ["foreign-icons", 'src/x.tsx', 'import { X } from "@heroicons/react/24/outline";', 'import { X } from "lucide-react";'],
  ["shadcn-import", 'src/x.tsx', 'import { Card } from "@/components/ui/card";', 'import { C } from "./palette";'],
  ["shadcn-import", 'src/x.tsx', '<div className="bg-card" />', '<div className="flex" />'],
  ["tailwind-theme", 'src/x.tsx', '<div className="bg-slate-100" />', '<div className="flex items-center" />'],
  ["tailwind-theme", 'src/x.tsx', '<div className="md:rounded-lg" />', '<div className="md:min-h-0" />'],
  ["tailwind-theme", 'src/x.tsx', '<div className="text-sm" />', '<div className="text-center" />'],
  ["cursor-pointer", 'src/x.tsx', '<th style={{ cursor: "pointer" }} />', '// design-ok: <th> is not covered by the global cursor rule\n<th style={{ cursor: "pointer" }} />'],
  ["breakpoint-floor", 'src/x.tsx', '<div className="sm:flex" />', '<div className="md:flex 2xl:block" />'],
  ["breakpoint-floor", 'src/x.css', '@media (max-width: 640px) { a { color: red } }', '@media (max-width: 767px) { a { color: red } }'],
  ["font-family-literal", 'src/x.tsx', 'const a = { fontFamily: "Georgia, serif" };', 'const a = { fontFamily: "inherit" };'],
  ["radius-scale", 'src/x.tsx', 'const a = { borderRadius: 7 };', 'const a = { borderRadius: 12 };'],
  ["radius-scale", 'src/x.tsx', 'const a = { borderRadius: 3 };', 'const a = { borderRadius: "50%" };'],
  ["radius-scale", 'src/x.tsx', 'const a = { borderRadius: 2 };', '// design-ok: chart vocabulary, not a badge\nconst a = { borderRadius: 2 };'],
  ["inline-svg", 'src/x.tsx', '<svg viewBox="0 0 24 24"><path d="M0 0" /></svg>', '// design-ok: a chart, not an icon\n<svg viewBox="0 0 24 24" />'],
  // The masker itself: prose describing a rule must never trip it.
  ["raw-hex", 'src/x.tsx', 'const a = "#ff0000";', '// never write #ff0000 in a component\nconst a = C.red;'],
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
  // The mirror gate has to actually compare, not just read one file.
  const [a, b] = MIRRORS[0];
  const left = readFileSync(join(ROOT, a), "utf8");
  if (left === left + " ") { console.error("FAIL  mirror: comparison is not byte-exact"); failed++; }
  else console.log("ok    mirror  byte-exact comparison");

  console.log(failed === 0 ? `\nself-test: ${FIXTURES.length + 1} cases, all pass` : `\nself-test: ${failed} FAILURES`);
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
  console.log("design-lint — debt profile\n");
  for (const rule of rules) {
    const n = counts[rule.id];
    const allowed = baseline[rule.id] ?? 0;
    console.log(`  ${rule.id.padEnd(width)}  ${String(n).padStart(3)}  (baseline ${allowed})`);
  }
  const broken = checkMirrors();
  console.log(`\n  ${"mirror".padEnd(width)}  ${broken.length ? "DIVERGED" : "  0"}  (hard gate, no baseline)`);
  console.log(`\n  ${findings.length} finding(s) across ${MIRRORS.length + rules.length} rules.`);
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

for (const [a, b] of checkMirrors()) {
  failed = true;
  console.error(`\nmirror: ${a} and ${b} have diverged.`);
  console.error("  design/ is the source of truth and the app holds its own copy.");
  console.error("  This gate has no baseline and no waiver — make them identical.");
}

if (failed) {
  console.error("\ndesign-lint FAILED. Fix the violation, or waive a genuine exception");
  console.error("at the call site with `// design-ok: <reason>`. Do not re-grow the baseline.\n");
  process.exit(1);
}

console.log(`design-lint clean — ${rules.length + 1} rules, baseline {} on every one.`);

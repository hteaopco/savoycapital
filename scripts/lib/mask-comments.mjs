/**
 * Blank out comment BODIES while preserving every byte offset and line break.
 *
 * Every scan in `design-lint.mjs` runs on the masked text, because a rule that
 * reads its own explanatory prose as a violation is worse than no rule. The
 * design docs are full of sentences like `never write #ffffff` — a `raw-hex`
 * rule scanning unmasked source flags the comment telling you not to.
 *
 * Offsets are preserved (comment characters become spaces, newlines survive) so
 * a match's index still maps to the right line in the ORIGINAL file. Waivers are
 * therefore read from the original text and violations from the masked text.
 *
 * Handles: `//`, `/* *\/`, JSX `{/* *\/}`, and skips over string and template
 * literals so a `"// not a comment"` string is not mistaken for one.
 */
export function maskComments(source) {
  const out = source.split("");
  const n = source.length;

  /** Blank [from, to) but keep newlines, so line numbers do not shift. */
  const blank = (from, to) => {
    for (let k = from; k < to && k < n; k++) {
      if (out[k] !== "\n") out[k] = " ";
    }
  };

  /**
   * Open template literals, innermost last. `depth` is the brace nesting of the
   * interpolation we are currently inside; 0 means we are in template TEXT.
   *
   * This stack is the fix for a real bug. The previous version BROKE OUT of a
   * template at `${` and never resumed, so the template's CLOSING backtick was
   * read as the OPENING backtick of a new string — and everything after it, up
   * to the next backtick or EOF, was skipped instead of masked. In a file like
   * `DealRoom.tsx`, where `border: \`1px solid ${C.border}\`` appears in a style
   * const near the top, that left every later comment VISIBLE to the rules.
   * Under-masking, so it produced false POSITIVES, not missed violations: prose
   * such as "that row is a <button>" read as real markup. Found by mobile-lint's
   * tap-target rule firing on three comments; `design-lint` shares this file and
   * had the same latent fault (a `#ffffff` written in a comment after any
   * interpolated template would have failed the build).
   */
  const templates = [];
  let i = 0;

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    const top = templates[templates.length - 1];

    // Inside template TEXT: only an escape, the closing backtick, or `${` matter.
    if (top && top.depth === 0) {
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { templates.pop(); i++; continue; }
      if (c === "$" && next === "{") { top.depth = 1; i += 2; continue; }
      i++;
      continue;
    }

    // Line comment
    if (c === "/" && next === "/") {
      let end = i;
      while (end < n && source[end] !== "\n") end++;
      blank(i, end);
      i = end;
      continue;
    }

    // Block comment (covers the JSX `{/* … */}` form — the braces stay, which
    // is harmless because no rule matches a bare brace)
    if (c === "/" && next === "*") {
      let end = i + 2;
      while (end < n && !(source[end] === "*" && source[end + 1] === "/")) end++;
      end = Math.min(end + 2, n);
      blank(i, end);
      i = end;
      continue;
    }

    // Template literal — pushed, so its `${…}` is scanned as code (a comment in
    // there still gets masked) and its closing backtick pops rather than opening
    // a phantom string.
    if (c === "`") {
      templates.push({ depth: 0 });
      i++;
      continue;
    }

    // Quoted string — skipped whole, so a `//` inside it is never a comment.
    // Bails at a newline because a JS string literal cannot span one: without
    // that guard an apostrophe in JSX text (`don't`) opens a string that runs
    // to the next apostrophe and swallows real code.
    if (c === '"' || c === "'") {
      const quote = c;
      let end = i + 1;
      while (end < n && source[end] !== "\n") {
        if (source[end] === "\\") { end += 2; continue; }
        if (source[end] === quote) { end++; break; }
        end++;
      }
      i = end;
      continue;
    }

    // Brace tracking, so we know when an interpolation hands control back.
    if (top) {
      if (c === "{") { top.depth++; i++; continue; }
      if (c === "}") { top.depth--; i++; continue; }
    }

    i++;
  }

  return out.join("");
}

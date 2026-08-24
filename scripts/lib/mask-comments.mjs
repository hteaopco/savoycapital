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
  let i = 0;

  /** Blank [from, to) but keep newlines, so line numbers do not shift. */
  const blank = (from, to) => {
    for (let k = from; k < to && k < n; k++) {
      if (out[k] !== "\n") out[k] = " ";
    }
  };

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

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

    // String literal — skipped whole, so its contents are never masked and a
    // `//` inside it is never treated as a comment.
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let end = i + 1;
      while (end < n) {
        if (source[end] === "\\") { end += 2; continue; }
        if (source[end] === quote) { end++; break; }
        // A template literal's `${…}` can hold anything, comments included.
        // Stopping at the interpolation and letting the outer loop handle it
        // is what keeps a commented-out branch inside one from being scanned.
        if (quote === "`" && source[end] === "$" && source[end + 1] === "{") break;
        end++;
      }
      i = end;
      continue;
    }

    i++;
  }

  return out.join("");
}

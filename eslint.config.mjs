import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs — it exports Linter.Config[]
// directly. Do NOT reintroduce the @eslint/eslintrc FlatCompat shim: wrapping
// these configs in compat.extends() throws "Converting circular structure to
// JSON" before a single file is linted.
export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // design/ is theAPlink's frozen reference material, uploads/ is raw handoff
    // files. Neither is app source. Same reasoning as tsconfig's exclude.
    ignores: ["design/**", "uploads/**", ".next/**"],
  },
];

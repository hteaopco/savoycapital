import type { Config } from "tailwindcss";

// Layout only. Every color, border, shadow and font decision comes from the `C`
// palette in src/components/palette.ts as an inline style — never from a Tailwind
// utility. See design/AP_DESIGN_REFERENCE.md § 2 for the rule this follows.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

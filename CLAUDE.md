```

```

---

# Savoy Capital Fund — Claude Code Guide

## Section 1: Project Overview

- **Project:** Savoy Capital Fund landing site
- **Tech stack:** Next.js + TypeScript + Tailwind CSS
- **Deployed on:** Railway, auto-deploys from the `main` branch on GitHub
- **GitHub repo:** `ThinkBeDo/savoy-capital-fund` (private)

### Key Files & Folders

| Path | What it does |
|------|-------------|
| `app/page.tsx` | The main landing page — hero section, portfolio cards |
| `app/layout.tsx` | Wraps every page (HTML head, metadata, global styles) |
| `app/globals.css` | Global styles and accent color variables |
| `package.json` | Project dependencies and scripts |
| `next.config.ts` | Next.js configuration |
| `public/` | Static assets (images, favicons, etc.) |

---

## Section 2: Rules for Claude (Strict)

- Make small, focused changes — one thing at a time.
- Commit and push directly to `main` — do NOT create branches or pull requests.
- Summarize: what changed, why, any risks, and any follow-ups needed.
- Ask before doing big refactors or restructuring.

---

## Section 3: Step-by-Step Workflow (for Jett)



---

## Section 4: How to Ask Claude Questions

You can ask Claude anything about the codebase. Examples:

- "Where is the sidebar code?"
- "How do I change the main heading text?"
- "Show me which file and line has the button color"
- "Create a new section for 'Our Team' but leave content empty"
- "What color is the Learn More button using?"
- "Add a new nav link in the sidebar for 'About'"

Claude will read the code and answer you, or make the change if you ask.

---

## Section 5: Debugging Production Issues

If something looks broken on the live site:

1. Go to **Railway** dashboard → click your project → click **Deployments** → click the latest deploy → view **Logs**.
2. Copy the error message or relevant log lines.
3. Paste them into Claude Code and say:
   > "Here is a production error from Railway. Diagnose the issue, propose a fix, and push it to main."
4. Claude will fix the issue, commit, and push to `main`.
5. Railway auto-redeploys from the push.

---



---

## Section 7: Quick Reference Card

| Task | What to tell Claude |
|------|-------------------|
| Change text | "Change [text] to [new text]" |
| Add section | "Add a new [section name] section below [existing section]" |
| Change color | "Change the [element] color to [color]" |
| Fix a bug | Paste Railway error + "fix this" |
| Ask a question | "Where is the code for [thing]?" |

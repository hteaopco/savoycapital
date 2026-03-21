```
QUICK START:
1. Claude Code → pick repo → describe change
2. Say "branch + PR, don't push to main"
3. Click PR link → Review → Merge
4. Wait 1 min → refresh live site
5. Bug? Copy Railway logs → paste in Claude Code → "fix via PR"
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
- Explain every change in plain language in the PR description.
- Summarize: what changed, why, any risks, and any follow-ups needed.
- Do not force-push. Do not delete config files. Do not change Railway settings.
- Ask before doing big refactors or restructuring.

---

## Section 3: Step-by-Step Workflow (for Jett)

Every time you want to make a change, follow these steps:

1. **Open Claude Code** in your browser and select the `savoy-capital-fund` repo.
2. **Describe what you want** in plain English. Be specific — examples:
   - "Change the subheading to 'Investing in Early-Stage B2B SaaS'"
   - "Add a fourth portfolio card with the name 'Acme Corp'"
   - "Change the navy accent color to a darker blue"
3. **Always add this sentence** to your request:
   > "Create a new branch from main, make the change, then open a GitHub pull request. Do not push directly to main."
4. **Wait for Claude** to finish and give you a PR link.
5. **Open GitHub**, review the pull request, and click **Merge pull request**.
6. **Wait about 1 minute**, then refresh your Railway URL to see the new version live.

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
   > "Here is a production error from Railway. Diagnose the issue, propose a fix, and implement it via a new branch and pull request."
4. Claude will create a fix and open a PR.
5. Review the PR on GitHub → Merge → Railway auto-redeploys.

---

## Section 6: Do NOT

### For Jett (Human):
- Do **not** edit files directly in GitHub unless you're comfortable with code.
- Do **not** connect other deploy tools or hosting services.
- Do **not** merge PRs without at least glancing at what changed.

### For Claude (AI):
- Do **not** force-push to any branch.
- Do **not** delete configuration files (`next.config.ts`, `package.json`, `tsconfig.json`).
- Do **not** change Railway settings or environment variables.
- **Ask before** doing big refactors, adding new dependencies, or restructuring folders.

---

## Section 7: Quick Reference Card

| Task | What to tell Claude |
|------|-------------------|
| Change text | "Change [text] to [new text], branch + PR" |
| Add section | "Add a new [section name] section below [existing section], branch + PR" |
| Change color | "Change the [element] color to [color], branch + PR" |
| Fix a bug | Paste Railway error + "fix via branch + PR" |
| Ask a question | "Where is the code for [thing]?" |

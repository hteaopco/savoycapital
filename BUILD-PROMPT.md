# Savoy Capital Fund — One-Shot Build Prompt for Claude Code

> **Instructions:** Paste this entire file as your first message in a fresh Claude Code session (browser). Claude Code will scaffold the app, create the GitHub repo, and prepare everything for Railway deploy.

---

You are my senior engineer. I want you to do ALL of the following for me, end to end, with clear status updates:

1. Create a new Next.js + TypeScript + Tailwind CSS app for a simple landing page project.
2. Initialize and push it to a new **private** GitHub repo under the `ThinkBeDo` org.
3. Prepare it so I can connect it to Railway for auto-deploys from the `main` branch.
4. Implement the initial landing page layout as described below.
5. Create and populate a `CLAUDE.md` file that explains to my NON-TECHNICAL partner exactly how to use Claude Code + GitHub + Railway safely.

I will do the minimal clicks in GitHub and Railway. You handle everything else in code and Git/GitHub integration.

---

## 0. Pre-Answered Setup Questions (DO NOT ASK — JUST PROCEED)

1. **GitHub repo name:** `savoy-capital-fund` under the `ThinkBeDo` organization
2. **Repo visibility:** Private
3. **Railway:** I (Tyler) will connect it manually after you push the initial code. Just make sure the app is Railway-ready.

---

## 1. Tech Stack & Structure

Use:
- **Next.js (latest, App Router)** with TypeScript
- **Tailwind CSS** for styling
- Standard Next.js file structure (no custom server)
- Layout designed for running as a Node server using `next start`, suitable for Railway's Node provider

Project expectations:
- `package.json` scripts must include:
  - `"dev": "next dev"`
  - `"build": "next build"`
  - `"start": "next start"`
- Railway will detect the Next app and run: install deps → `npm run build` → `npm run start`

Create:
- `README.md` with:
  - How to run locally: `npm install`, `npm run dev`
  - How Railway builds and starts the app
  - Placeholder for Railway URL once connected
- `CLAUDE.md` (detailed content in section 4 below)

---

## 2. Landing Page Requirements

Implement a minimal landing page at `/` with:

**Colors:**
- Background: white (`#FFFFFF`)
- Default text color: black (`#000000`)
- Accent colors available via Tailwind config + CSS custom properties:
  - `--accent-green`: `#2E7D32` (or similar dark green)
  - `--accent-red`: `#C62828` (or similar dark red)
  - `--accent-navy`: `#1A237E` (or similar navy)

**Layout:**
- **Left-hand sidebar** navigation (fixed or sticky):
  - Top: Text logo "Savoy Capital Fund" in navy
  - One nav link labeled "Portfolio" — scrolls to or links to a placeholder `#portfolio` section
  - Sidebar background: white with a subtle right border
- **Main content area:**
  - Hero section with:
    - Main heading: "Savoy Capital Fund"
    - Subheading: "Backing Exceptional SaaS Founders" (placeholder — Jett will change this)
    - One CTA button in navy accent: "Learn More" (scrolls to portfolio section)
  - Portfolio section (`#portfolio`):
    - Section heading: "Our Portfolio"
    - 3-column grid of placeholder cards (empty boxes with "Portfolio Company" placeholder text)
    - This is the section Jett will fill in with real portfolio companies later

**Design principles:**
- Clean, minimal, professional — think institutional fund site, not startup landing page
- Easy to modify — Jett will be making changes via Claude Code in the browser
- Keep component count low — ideally everything fits in `app/page.tsx` + `app/layout.tsx` + a few components
- Use Tailwind classes directly; avoid abstraction layers Jett won't understand

---

## 3. GitHub Repo + Railway Readiness

After creating the Next app in your environment:

1. Initialize Git, create the repo structure, and connect to GitHub using your GitHub integration — not manual shell instructions.
2. Create the repo as `ThinkBeDo/savoy-capital-fund` (private).
3. Push the initial code to a `main` branch.
4. Confirm:
   - The repo exists on GitHub and is accessible
   - `package.json` has correct `dev`, `build`, and `start` scripts
   - `npm run build` succeeds in your environment

Then give me:
- The GitHub repo URL
- Exact steps I should take in the **Railway web UI** to:
  - Create a new project
  - Choose GitHub deploy
  - Select this repo
  - Confirm build and start commands (if Railway doesn't auto-detect)
  - Set auto-deploy from `main`
- Remind me to enable **branch protection on `main`** in GitHub settings (require PRs, block direct push)

---

## 4. Create `CLAUDE.md` for My Partner

Create a detailed `CLAUDE.md` at the repo root that covers:

### Section 1: Project Overview
- Project name: Savoy Capital Fund
- Tech stack: Next.js + TypeScript + Tailwind CSS
- Deployed on Railway via GitHub auto-deploy from `main`
- Key files/folders and what they do

### Section 2: Rules for Claude (Strict)
- ALWAYS use branch + pull request for changes
- NEVER push directly to `main`
- Make small, focused changes
- Explain changes in plain language in the PR description
- Summarize what changed, why, any risks or follow-ups

### Section 3: Step-by-Step Workflow for Non-Technical Partner
Write this as a numbered checklist Jett can follow every time:
1. Open Claude Code → select savoy-capital-fund repo
2. Describe what you want in plain English
3. Always add: "Create a new branch from main, make the change, then open a GitHub pull request. Do not push directly to main."
4. Wait for Claude to give the PR link
5. Open GitHub, review the PR, click Merge
6. Wait ~1 min, refresh Railway URL to see new version

### Section 4: How to Ask Claude Questions
Show examples like:
- "Where is the sidebar code?"
- "How do I change the main heading text?"
- "Show me which file and line has the button color"
- "Create a new section for 'Our Team' but leave content empty"

### Section 5: Debugging Production Issues
Workflow for when something breaks:
1. Human goes to Railway → copies error/log
2. Pastes into Claude Code and says: "Here is a production error from Railway. Diagnose, propose fix, implement via branch + PR."
3. Claude implements fix, opens PR
4. Human reviews + merges → Railway redeploys

### Section 6: Do NOT
- Human: Do not edit files directly in GitHub unless comfortable. Do not connect other deploy tools.
- Claude: Do not force-push. Do not delete config files. Do not change Railway settings. Ask before big refactors.

### Section 7: Quick Reference Card
Add a short 5-line "cheat sheet" at the very top of CLAUDE.md (before the detailed sections) that summarizes the entire workflow in one glance:
```
QUICK START:
1. Claude Code → pick repo → describe change
2. Say "branch + PR, don't push to main"
3. Click PR link → Review → Merge
4. Wait 1 min → refresh live site
5. Bug? Copy Railway logs → paste in Claude Code → "fix via PR"
```

---

## 5. What I Expect Back From You

When you are done with initial setup, respond with:

1. **The GitHub repo URL** (`ThinkBeDo/savoy-capital-fund`)
2. **The complete file tree** of the repo
3. **Contents of key files:**
   - `package.json`
   - `README.md`
   - `CLAUDE.md`
   - `app/layout.tsx`
   - `app/page.tsx`
   - `tailwind.config.ts` (showing custom colors)
4. **A Sanity Checklist for me (Tyler):**
   - "Run `npm install` then `npm run dev` locally to confirm it works"
   - "Connect GitHub repo to Railway: New Project → Deploy from GitHub → select `ThinkBeDo/savoy-capital-fund` → confirm build (`npm run build`) and start (`npm run start`) → set auto-deploy from `main`"
   - "Enable branch protection on `main` in GitHub Settings → Branches → Add rule → Require pull request before merging, block direct pushes"
   - "After first Railway deploy, visit [RAILWAY_URL] to confirm the landing page renders"
   - "Share the repo + Railway URL + CLAUDE.md with Jett — he's ready to start building"

After that, the project is live and ready for handoff.

**Begin now. Do not ask me any setup questions — everything is pre-answered above. Start scaffolding.**

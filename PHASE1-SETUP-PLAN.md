# SeatCheck — Phase 1 setup plan (for review)

**Purpose:** Scaffold the project with Next.js (App Router), Tailwind CSS, Supabase wiring, and Vercel deployment — **no product UI and no monitoring features yet** (only minimal plumbing and placeholders).

**Audience:** This document is written for a UX designer comfortable with HTML/CSS; jargon is explained briefly where it matters.

---

## What “Phase 1” will deliver

| In scope | Out of scope (later phases) |
|----------|-----------------------------|
| A working Next.js app using the **App Router** | Dashboard, forms, WatchCard, etc. |
| **Tailwind CSS** configured and ready to use | Real pages beyond a bare shell |
| **Supabase client helpers** (server-safe) and env validation | Cron jobs, scraping, alerts |
| **`/lib/types.ts`** matching your database rules (schema types only) | Seed script, API routes that mutate data |
| **`.env.example`** (Supabase keys only; see below) + `.gitignore` for secrets | Resend/Twilio/API keys (documented in `database.md` for later) |
| **Vercel project** linked to your repo; env vars documented for the dashboard | Production data or backups |

---

## Note about your PRD

Your workspace does not currently include a file named “PRD.” This plan assumes **Phase 1** means: *project skeleton + tooling + Supabase connection plumbing + deployment hookup*, consistent with your `.cursor/rules/database.md` and stack (Next.js, Tailwind, Supabase, Vercel).

**If your PRD’s Phase 1 differs** (e.g., it includes auth, Storybook, or a design system package), say so before implementation and we will adjust this plan.

---

## Decisions and assumptions

1. **Package manager:** **pnpm** (fast, strict; widely used with Next.js). If you prefer **npm** or **yarn**, say so — one line changes the commands.
2. **Next.js version:** Use the **current stable** release from `create-next-app` at setup time (App Router, TypeScript, Tailwind, ESLint where applicable).
3. **Tailwind:** Follow **defaults from `create-next-app`** (including Tailwind v4 if that is what the installer ships). Your design rules mention `tailwind.config.js`; the scaffold may use `tailwind.config.ts` or a different layout — we will match the generated project **without** adding UI or design tokens in Phase 1 (your brief says CSS variables belong in `globals.css` when building UI; Phase 1 can leave the default global stylesheet minimal).
4. **Supabase usage in Phase 1:** The app is a **personal tool with no user accounts** (per `database.md`). **Approved approach: server-only** — one Supabase helper used only on the server (Route Handlers, Server Components, Server Actions later), using `SUPABASE_SERVICE_ROLE_KEY`. **No separate “browser” Supabase file in Phase 1.**

   **Why (plain language):** There are two common ways to talk to Supabase from a web app. **Server-side** means the secret key stays on the computer that runs your app (Vercel’s servers). **Browser-side** means a key is bundled into the page visitors download. Your database rules turn off row-level security for a personal tool, so **if** the browser had database access, anyone who could read your public site could potentially read or change your data. Starting **server-only** keeps all database access behind your app until you add login or stricter database rules later. We can add a browser client in a future phase if a feature truly needs it.
5. **Database tables:** Phase 1 **does not require** you to run SQL in Supabase yet for the app to build. We **will** add `/lib/types.ts` as specified in `database.md` so Phase 2 stays aligned. Running the DDL in the Supabase SQL editor can happen in Phase 1 or early Phase 2 — whichever you prefer.
6. **Git hosting:** **Approved:** **public** GitHub repository.
7. **Region / project names:** Supabase project region and naming are left to you in the Supabase UI; they do not block Phase 1 code.

---

## What requires your input (before or during setup)

| Topic | Why it matters |
|--------|----------------|
| **Supabase project** | You create the project at [supabase.com](https://supabase.com); you copy **Project URL** and keys into env vars. |
| **Exact env var names** | Your `database.md` already specifies names — we will use those **exactly** so nothing breaks later. |
| **Git remote** | Vercel deploys from a Git repo; you need a GitHub (etc.) account and a new repository for SeatCheck. |
| **Service role vs anon** | Service role bypasses RLS; with RLS disabled on tables, both keys are powerful — still keep service role **server-only**. |

### Environment variables (from your rules)

These names are fixed for consistency with the rest of the project:

**Required for Supabase wiring in Phase 1:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — *Supabase always issues this; keep it in `.env` for when you add client or SSR patterns later. Phase 1 code will not load it in the browser.*
- `SUPABASE_SERVICE_ROLE_KEY` — *server only; never expose to the client.*

**Approved for `.env.example`:** **Supabase variables only** (the three above), plus a short comment that email/SMS/ticket API keys will be added when those features ship (full list stays documented in `database.md`). This keeps the file short and avoids a wall of empty keys you do not need yet.

---

## Proposed folder structure (after Phase 1)

Reasonable default for Next.js App Router + shared code:

```
seatcheck/
├── .cursor/rules/          # already present — your AI/design/database rules
├── app/
│   ├── layout.tsx            # root layout (minimal)
│   ├── page.tsx              # temporary placeholder route (no real UI — see below)
│   ├── globals.css           # Tailwind base; no design system in Phase 1
│   └── favicon.ico           # default from scaffold
├── lib/
│   ├── supabase/
│   │   └── server.ts         # create Supabase client for server (service role)
│   └── types.ts              # Watch, Snapshot, AlertLog types per database.md
├── public/                   # static assets (empty or default)
├── .env.example              # documented keys, no secrets
├── .gitignore                # includes .env.local
├── next.config.ts            # or .mjs — from create-next-app
├── package.json
├── postcss.config.mjs        # from Tailwind setup
├── tailwind.config.ts        # darkMode: "media" per design brief (no UI in Phase 1)
├── README.md                 # short “how to run” + link to this plan
├── PHASE1-SETUP-PLAN.md      # this file
└── tsconfig.json
```

**Optional** (only if we adopt the common Supabase SSR pattern with cookies — usually when using auth). Since you have **no auth** in v1, we may **skip** `middleware.ts` in Phase 1 to avoid complexity. We can add it in Phase 2 if needed.

---

## Starter files — what each is for (non-developer friendly)

| File / area | Role |
|-------------|------|
| `app/layout.tsx` | Wraps every page; keeps HTML shell (`<html>`, `<body>`). |
| `app/page.tsx` | **Temporary:** **approved:** a single line of plain text so you know the app runs — **not** a designed screen. |
| `app/globals.css` | Tailwind entry; Phase 1 stays minimal (no full design tokens unless you want a stub). |
| `lib/types.ts` | TypeScript descriptions of your future database rows — helps prevent mistakes when coding features. |
| `lib/supabase/server.ts` | One place that reads env vars and creates a Supabase client for server code. |
| `.env.local` | **On your machine only** — real secrets. Not committed. |
| `.env.example` | **Committed** — list of variable *names* for you and Vercel. |

---

## Implementation steps

1. **Initialize Next.js** in `/Users/ari/Desktop/seatcheck` with TypeScript, Tailwind, ESLint, App Router, `src/` **off** (to match the structure above — unless you prefer `src/app`; say so).
2. **Add Supabase** dependency (`@supabase/supabase-js`) and the **server client** helper; validate required env vars in development with clear errors.
3. **Add `/lib/types.ts`** to match `database.md` (no DB migrations in repo unless you want Supabase CLI later).
4. **Add `.env.example`** and ensure `.gitignore` ignores `.env.local`.
5. **Initialize git** (if not already), commit, push to GitHub.
6. **Vercel:** Import the repo, set framework to Next.js, add the same env vars as `.env.local` for Preview/Production, deploy.

---

## Vercel checklist (you’ll do this in the browser)

1. Push code to GitHub.
2. Log into [vercel.com](https://vercel.com) → New Project → Import your repo.
3. Add environment variables (same names as `.env.example`); for local-only keys, never paste service role in client-side code.
4. Deploy; open the production URL and confirm the placeholder page loads.

---

## Approved decisions (your answers + recommendations)

| Topic | Decision |
|--------|----------|
| GitHub repo visibility | **Public** |
| Where Supabase runs first | **Server-only** (recommended; see “Decisions and assumptions” #4). No browser Supabase helper file in Phase 1. |
| Placeholder home page | **Single line of plain text** |
| `.env.example` contents | **Supabase keys only** (recommended), with a note that other keys are listed in `database.md` for later phases |

---

## Risks / things to flag early

- **Secrets:** Anyone with your `SUPABASE_SERVICE_ROLE_KEY` can read/write your database. Store it only in `.env.local` and Vercel env settings — never in chat screenshots or commits.
- **RLS disabled:** Your rules intentionally disable RLS for a personal tool; that means **network access to the key = full data access**. Keeping keys server-side reduces risk.

---

## Status

Plan approved with the decisions above. **Phase 1 scaffold is in the repo** (Next.js, Tailwind, server Supabase helper, types, `.env.example`, `README.md`). **Vercel** is not connected from here — follow `README.md` after you push to GitHub.

On your machine: install [Node.js](https://nodejs.org/) LTS, run `pnpm install`, then `pnpm dev` to verify.

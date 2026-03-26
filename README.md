# SeatCheck

Personal ticket monitoring (Phase 1: scaffold only — no product UI yet).

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (includes `npm`; this project uses [pnpm](https://pnpm.io/installation))
- A [Supabase](https://supabase.com/) project (for local and production env vars)
- A [GitHub](https://github.com/) account and a **public** repo for this code
- A [Vercel](https://vercel.com/) account (connects to GitHub for deploys)

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **API**, copy:

   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (stored for later phases; Phase 1 server code uses the service role only)
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret; never commit)

4. Run the dev server:

   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). You should see a single line of plain text: `SeatCheck — dev`.

## Scripts

| Command       | Purpose              |
| ------------- | -------------------- |
| `pnpm dev`    | Local development    |
| `pnpm build`  | Production build     |
| `pnpm start`  | Run production build |
| `pnpm lint`   | ESLint               |

## Deploy on Vercel

1. Push this repository to GitHub (public is fine).
2. In Vercel: **Add New** → **Project** → **Import** your GitHub repo.
3. Framework preset: **Next.js** (default).
4. Add the same variables as in `.env.example` (with real values) under **Settings** → **Environment Variables** for Production (and Preview if you use PRs).
5. Deploy. Vercel will build from `main` (or your default branch) on each push.

More detail: [PHASE1-SETUP-PLAN.md](./PHASE1-SETUP-PLAN.md).

## Project rules

Design and data conventions live in `.cursor/rules/` (including `database.md` and `design-brief.md`).

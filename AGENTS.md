<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Setup (npm install, DB provisioning, Playwright browsers) is handled outside this file; the notes below are the non-obvious startup/run caveats for this environment.

### Services

- **PostgreSQL** is installed natively via apt (not Docker — Docker is not available here). The `docker compose up -d` step in `README.md` does not apply; instead start the cluster with `sudo pg_ctlcluster 16 main start` (idempotent; it does not auto-start on VM boot). It listens on `localhost:5432` with role/password/db all `pedemeia`, which matches the `DATABASE_URL` in `.env`.
- A `.env` file is required (see `.env.example`): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`. It is created during setup and persists in the VM snapshot.
- **Next.js app**: `npm run dev` serves on `http://localhost:3000`. The app is auth-gated; `/` redirects to `/login` when logged out, or `/totais` when logged in. After sign-in the app redirects to `/totais`. Demo login: `demo@pedemeia.dev` / `password123`.

### Standard commands

Run/lint/test/build commands live in `package.json` scripts and `README.md` (`npm run dev`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run db:migrate`, `npm run db:seed`). Migrations are already committed under `prisma/migrations/`, so `npm run db:migrate` applies them without prompting for a name.

### Known pre-existing issues (not environment problems)

- `npm run lint` reports 1 pre-existing error in `src/components/horizon/HorizonView.tsx` (`react-hooks/set-state-in-effect`).
- `npm run test:e2e` — prefer running against a seeded demo user; auth lands on `/totais`.

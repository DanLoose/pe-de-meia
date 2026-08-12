# Pé-de-meia

App web de finanças pessoais: **receitas e gastos fixos**, **estimativa de gastos variáveis** (custo de vida) e planilha de **caixa** com projeção.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (credentials)
- Tailwind CSS + shadcn/ui

## Prerequisites

- Node.js 20+
- Docker Desktop (for local PostgreSQL)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

Update `AUTH_SECRET` with a secure random value:

```bash
openssl rand -base64 32
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Run database migrations:

```bash
npm run db:migrate
```

When prompted for a migration name on first setup, use `init`.

5. Optional: seed a demo user and default categories:

```bash
npm run db:seed
```

Demo credentials: `demo@pedemeia.dev` / `password123`

6. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). After sign-in the app opens **Totais** (`/totais`).

## Features (product V1)

- Email/password sign up and sign in
- **Receitas fixas** e **gastos fixos** (recorrentes)
- **Gastos variáveis (estimativa)** — orçamento mensal do consumo variável (sem teto diário nesta fase)
- **Custo de vida** ≈ fixos + estimativa de variáveis
- Planilha **Saldos** (saldo running), **Totais**, **Horizonte**
- Tags, cartão (fechamento/vencimento), onboarding
- User-scoped data

Product/domain definitions: [`docs/PRODUTO.md`](docs/PRODUTO.md), [`docs/DOMINIO.md`](docs/DOMINIO.md), [`docs/MAPEAMENTO-LEGADO.md`](docs/MAPEAMENTO-LEGADO.md).

**Later (not V1):** daily expense logging with payment method (V2); optional “Diário” ceiling (V3).

## Automated tests (Playwright)

Prerequisites: Docker Postgres running (`docker compose up -d`) and migrations applied.

```bash
npm run test:e2e
```

Other commands:

- `npm run test:e2e:ui` — interactive Playwright UI
- `npm run test:e2e:report` — open the last HTML report

Tests seed the demo user automatically before running.

## Project scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run lint` — run ESLint
- `npm run db:migrate` — run Prisma migrations
- `npm run db:seed` — seed demo data
- `npm run db:studio` — open Prisma Studio
- `npm run test:e2e` — run Playwright end-to-end tests

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Secret for Auth.js session encryption |
| `AUTH_URL` | App URL (e.g. `http://localhost:3000`) |

## Architecture notes

- All financial records are scoped by `userId`
- Business logic lives in `src/lib/services/`
- Server actions in `src/app/actions/` handle mutations and reads
- Default categories are created on registration (and via seed for demo user)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the full stack
```bash
docker compose up          # Start all services (postgres, backend, frontend)
docker compose up -d       # Detached mode
docker compose down        # Stop all services
docker compose logs -f backend   # Follow backend logs
```

### Backend (NestJS)
```bash
cd backend
npm install --include=dev       # Must include devDependencies explicitly
npm run start:dev               # Dev with hot-reload (used by Docker)
npx tsc --noEmit                # Type-check without compiling (dist/ is owned by root/Docker)
npm run lint
npm run migration:run           # Apply pending migrations
npm run migration:generate -- src/migrations/MigrationName   # Generate from entity changes
npm run migration:revert        # Revert last migration
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev         # Vite dev server on port 5173
npm run build       # tsc -b && vite build
npm run lint
```

## Architecture Overview

### Stack
- **Backend**: NestJS 10 + TypeORM + PostgreSQL 16
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS v3 + shadcn/ui (Radix UI)
- **Auth**: JWT access tokens (15m) + refresh tokens (7d), hashed with bcrypt and stored in DB
- **Dev environment**: Docker Compose orchestrates all three services with hot-reload volumes

### Backend module structure
```
AppModule
├── ConfigModule (global)
├── TypeOrmModule (async, synchronize: true in dev)
├── AuthModule → UsersModule
├── MonedasModule
├── PrestamosModule
├── OperacionesModule
└── DashboardModule
```

Each module follows NestJS conventions: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `entities/`, `dto/`. Shared enums live in `src/common/enums/`.

Global API prefix is `api`. Swagger docs available at `/api/docs`. All endpoints require JWT except `@Public` decorated routes.

### Database schema key points
- All monetary fields use `decimal(18,8)` (never `float`)
- `monedas` table is seeded via migration; `Moneda` enum (ARS, USDT, USD, BTC) corresponds to these codes
- `prestamos` → `cuotas_interes` (one-to-many, auto-generated on loan creation)
- `operaciones` optionally link to a `prestamo` (nullable FK)
- `TypeORM synchronize: true` in development — schema auto-updates from entity changes

### Core business logic
1. **Loan creation** (`PrestamosService.create`): Creates `Prestamo` then calls `generarCuotas()` to auto-create one `CuotaInteres` per month for the loan duration. Rate types: `PORCENTAJE` (%) or `FIJO` (fixed amount per month).
2. **Dashboard movimientos** (`DashboardService.getMovimientos`): Implements double-entry (debe/haber) accounting across loans received, capital returns, interest payments, and currency trades.
3. **Profit calculation** (`DashboardService.getGananciaPorPrestamo`): Net gain = trading income per currency − interest costs paid.

### Frontend structure
- **Auth flow**: `ProtectedRoute` in `App.tsx` guards all routes except `/login`. Tokens stored in `localStorage`.
- **API client** (`src/services/api.ts`): Centralized HTTP client that auto-injects `Authorization: Bearer` from localStorage. All service files use this client.
- **Vite proxy**: `/api` requests proxy to `http://backend:3000` in dev (configured in `vite.config.ts`).
- **Formatting utilities** (`src/lib/format.ts`): Use `formatMonto(amount, moneda)` for currency display — BTC uses 8 decimals, ARS uses locale formatting.
- **Types** (`src/types/index.ts`): Single source of truth for all TypeScript interfaces matching backend entities.

### Environment variables
Copy `.env.example` to `.env`. Key vars:
- `VITE_API_URL` — used by frontend (falls back to `/api`)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — must differ in production
- `DB_*` — PostgreSQL connection (Docker service name `postgres` as host inside Docker)
- `FRONTEND_URL` — used by backend CORS config

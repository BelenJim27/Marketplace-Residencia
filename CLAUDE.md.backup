# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Marketplace-Residencia is a NestJS + Next.js monorepo for a mezcal producer marketplace (Oaxaca), orchestrated with Turborepo and npm workspaces.

## Monorepo Structure

```
apps/
  api/    # NestJS 11 backend (port 3001)
  web/    # Next.js 16 frontend (port 3000)
packages/
  database/  # Shared Prisma schema & generated client
turbo.json   # Task pipeline config
```

## Common Commands

### From the root (Turbo)
```bash
npm run dev          # Start both api and web in watch mode
npm run build        # Build all apps
npm run build:api    # Build only the API
npm run build:web    # Build only the web
npm run lint         # Lint all apps
npm run test         # Run all tests
npm run db:generate  # Regenerate Prisma client after schema changes
```

### API only (apps/api)
```bash
npm run start:dev    # Watch mode (nest start --watch)
npm run start:prod   # Run compiled dist
npm run test         # Jest unit tests
npm run test:watch   # Jest in watch mode
npm run test:cov     # Coverage report
npm run test:e2e     # End-to-end tests
npm run lint         # ESLint with auto-fix
npm run prisma:generate  # Regenerate Prisma client

# Run a single test file
npx jest src/modules/auth/auth.service.spec.ts --no-coverage
```

### Web only (apps/web)
```bash
npm run dev    # next dev
npm run build  # next build
npm run lint   # next lint
```

### Database (packages/database)
```bash
npm run db:migrate   # prisma migrate dev (creates migration files)
npm run db:push      # prisma db push (push schema without migration)
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Open Prisma Studio UI
```

### Database seeding (apps/api)
```bash
node scripts/seed-roles.js        # Seed roles
node scripts/seed-usuarios.js     # Seed demo users
```

## Environment Variables

Required in root `.env` (also duplicated in `apps/api/.env`):
```
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback/google
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PORT=3001
SENDGRID_API_KEY=
EMAIL_FROM=
```

The API (`main.ts`) loads env files in this priority order: `apps/api/.env` → `apps/api/dist/../.env` → root `.env`. CORS is controlled by `FRONTEND_URL`.

## Architecture

### Backend (apps/api)

NestJS 11 with 23 feature modules under `src/modules/`. Each module follows the standard NestJS pattern: `module.ts`, `controller.ts`, `service.ts`, `dto/`.

Key cross-cutting concerns:
- **Auth**: JWT access tokens (15m) + refresh tokens (30d). Guards in `auth/auth.guard.ts` (bearer validation) and `auth/rbac.guard.ts` (role-based). OAuth via Google in `auth/oauth.controller.ts`. JWTs are built manually with HMAC-SHA256 (no `jsonwebtoken` library) — see `auth.service.ts`.
- **Database**: Singleton `PrismaService` at `src/prisma/prisma.service.ts` wraps the shared Prisma client from `packages/database`.
- **BigInt serialization**: `main.ts` patches `BigInt.prototype.toJSON` to serialize as `Number`. All BigInt DB ids become numbers in JSON.
- **File uploads**: Multer; files saved to `apps/api/uploads/`; served as static assets at `/uploads`.
- **Email**: SendGrid via `modules/email/email.service.ts`.
- **Validation**: Global `ValidationPipe` with `whitelist: true`, `transform: true`, `transformOptions: { enableImplicitConversion: true }`.

### Frontend (apps/web)

Next.js 16 App Router. Pages live under `src/app/`. TypeScript errors and ESLint are intentionally ignored during builds (`next.config.mjs`).

**Route structure and layout selection** (`root-content.tsx`):
- `/auth/*` → TiendaHeader (no sidebar)
- `/tienda/*`, `/Cliente/*` → TiendaHeader (no sidebar)
- `/`, `/producto`, `/producto/*` → TiendaHeader (no sidebar)
- Authenticated Admin or Productor on any other route → full Sidebar + Header
- All other authenticated users → TiendaHeader

**API proxy rewrites** (`next.config.mjs`): `/uploads/`, `/inventario/`, `/productos/`, `/productores/`, `/pedidos/`, `/categorias/` are forwarded to the API. Direct calls in `api.ts` bypass the proxy and hit `NEXT_PUBLIC_API_URL` directly.

Key integrations:
- **Auth (dual-mode)**: `AuthContext` reads from both NextAuth session (OAuth) and custom cookies (`token`, `refresh_token`, `usuario`). The cookie-based flow is used for email/password login; NextAuth wraps Google OAuth. Both paths end up populating the same `AuthContext` state.
- **API client**: `src/lib/api.ts` centralizes all fetch calls. It implements automatic token refresh with a **singleton deduplication pattern** — concurrent 401s share a single refresh call to avoid invalidating each other's tokens.
- **i18n**: `next-intl` with Spanish (`es`, default) and English (`en`), configured in `src/i18n/routing.ts`.
- **Theming**: `next-themes` for dark/light mode.
- **Providers order** (`providers.tsx`): `SessionProvider` → `ThemeProvider` → `AuthProvider` → `CarritoProvider` → `WishlistProvider` → `ConfigProvider` → `SidebarProvider`.

### Database (packages/database)

PostgreSQL via Neon (serverless). Schema at `packages/database/prisma/schema.prisma`. After any schema change, run `npm run db:generate` from the root to regenerate the Prisma client used by the API.

Key domain models: `usuarios`, `roles`, `productos`, `categorias`, `tiendas`, `productores`, `lotes`, `inventario`, `pedidos`, `carrito_item`, `pagos`, `envios`, `resenas`, `notificaciones`, `oauth_cuentas`, `auditoria`.

## Module Reference

| Module | Responsibility |
|---|---|
| auth | JWT login/register/refresh, OAuth, password reset |
| usuarios | User profiles, CRUD |
| roles | RBAC role definitions |
| productores | Producer profiles, onboarding approval flow |
| tiendas | Store management |
| productos | Product catalog |
| categorias | Hierarchical product categories |
| inventario | Stock levels |
| lotes | Producer batch/lot tracking |
| pedidos | Order lifecycle |
| carrito | Shopping cart |
| wishlist | Saved items |
| pagos | Payment records |
| envios | Shipment tracking |
| transportistas | Carrier management |
| resenas | Product reviews |
| direcciones | Delivery addresses |
| email | SendGrid email delivery |
| notificaciones | In-app user notifications |
| archivos | File upload/storage |
| configuracion | System settings |
| auditoria | Audit log |
| admin | Admin-only operations |

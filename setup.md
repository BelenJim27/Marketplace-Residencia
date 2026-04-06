# Marketplace Monorepo Setup

## Overview

This monorepo combines **Next.js**, **NestJS**, and **Prisma** using **Turborepo** for efficient build orchestration.

## Structure

```
marketplace-monorepo/
├── apps/
│   ├── web/          # Next.js 16 - Frontend (template)
│   └── api/          # NestJS 11 + Prisma 5 - Backend API
├── packages/
│   └── database/     # Prisma schema and client - Shared DB layer
├── turbo.json        # Turborepo configuration
├── package.json      # Root workspace package
└── .env              # Environment variables (DATABASE_URL)
```

## Technologies & Versions

| Package | Version |
|---------|---------|
| Next.js | 16.1.6 |
| React | 19.2.0 |
| NestJS | 11.0.0 |
| Prisma | 5.22.0 |
| Turborepo | 2.0.0 |
| Node.js | 22.x |

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database

Create a `.env` file in the root directory with your PostgreSQL credentials:
```bash
# Create .env in the root of the project
DATABASE_URL="postgresql://user:password@localhost:5432/marketplace?schema=public"
```

Example for the production database:
```env
DATABASE_URL="postgresql://belen:953657@100.79.91.46:5432/ecommerce-Oaxaca"
```

### 3. Generate Prisma Client

Generate the Prisma Client:
```bash
npx prisma generate --schema=packages/database/prisma/schema.prisma
```

### 4. Sync Database Schema (Optional)

Push the schema to your database:
```bash
npx prisma db push --schema=packages/database/prisma/schema.prisma
```

## Available Scripts

### Root Level
```bash
npm run dev      # Start development (requires manual start of each app)
npm run build    # Build all applications
npm run lint     # Lint all applications
npm run test     # Run tests
```

### Frontend (apps/web)
```bash
cd apps/web
npm run dev      # Start Next.js on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
npm run start    # Start production server
```

### Backend (apps/api)
```bash
cd apps/api
npm run start          # Start NestJS on http://localhost:3001 (uses ts-node)
npm run start:dev     # Start NestJS with watch mode
npm run start:prod    # Start compiled production server
npm run build         # Compile TypeScript to dist/
npm run prisma:generate # Regenerate Prisma Client
```

### Database Package (packages/database)
```bash
cd packages/database
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio   # Open Prisma Studio UI
```

## Environment Variables

### Root (.env) - Required for API
```
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

### Frontend (apps/web/.env) - Optional
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Architecture & Communication Flow

### Monorepo Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                       MARKETPLACE MONOREPO                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   apps/web (Next.js)  ───────────►  apps/api (NestJS) ───► DB │
│   Puerto 3000                      Puerto 3001              Postgres│
│                                                                  │
│   packages/database/  ──────────►  Comparte Prisma Client       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│                     localhost:3000                          │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  React      │    │  Server     │    │  Client     │     │
│  │  Components │    │  Actions    │    │  Fetch      │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
          │
          │  HTTP Requests
          │  (fetch/axios)
          ▼
┌─────────────────────────────────────────────────────────────┐
│          Backend (NestJS) - localhost:3001                   │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Controllers │    │  Services   │    │  Guards      │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                               │
│         └────────┬─────────┘                               │
│                  ▼                                          │
│  ┌─────────────────────────────────────────────────┐       │
│  │              PrismaService                      │       │
│  └─────────────────────────────────────────────────┘       │
│                  │                                          │
└──────────────────┼──────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
└─────────────────────────────────────────────────────────────┘
```

### How Communication Works

**1. Frontend → Backend (HTTP REST)**

```
apps/web                    apps/api                     DB
   │                           │                           │
   ├──► fetch('/productos') ─►│                           │
   │                           ├── Controllers            │
   │                           ├── Services               │
   │                           ├── PrismaService          │
   │                           │         └──► query ─────►│
   │                           │                           │
   ◄────── JSON response ──────┤                           │
   │                           │                           │
```

**2. Prisma Schema Sharing**

```
packages/database/
      │
      └── prisma/schema.prisma  ──►  npx prisma generate
                                        │
                                        ▼
                              node_modules/@prisma/client
                                        │
                                        ▼
                              apps/api/src/prisma/prisma.service.ts
                              import { PrismaClient } from '@prisma/client'
```

### Communication Configuration

| Variable | Location | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | `.env` (root) | Connect API to PostgreSQL |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env` | Frontend knows API URL |

### Data Flow Summary

1. **User interacts** with Next.js frontend (port 3000)
2. **Frontend makes** HTTP request to NestJS API (port 3001)
3. **API Controller** receives request, delegates to Service
4. **Service** uses PrismaService to query database
5. **Prisma** executes SQL query on PostgreSQL
6. **Result** returns through the chain to the frontend

### Example: Full Communication Chain

```typescript
// === FRONTEND (apps/web) ===
// src/app/actions.ts
'use server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getProducts() {
  const res = await fetch(`${API_URL}/productos`, { cache: 'no-store' })
  return res.json()
}

// === BACKEND (apps/api) ===
// src/productos/productos.controller.ts
@Controller('productos')
export class ProductosController {
  constructor(private prisma: PrismaService) {}
  
  @Get()
  async findAll() {
    return this.prisma.productos.findMany()
  }
}

// === PRISMA SERVICE ===
// src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  async onModuleInit() {
    await this.$connect()  // Connects to PostgreSQL
  }
}
```

### Key Communication Points

- **API URL**: Frontend uses `http://localhost:3001` (or env variable)
- **Prisma Client**: Generated from shared schema, used by API
- **Database**: PostgreSQL at `100.79.91.46:5432/ecommerce-Oaxaca`
- **No direct frontend-DB**: All requests go through NestJS API

### Example: Calling API from Next.js

```typescript
// src/app/actions.ts (Server Action)
'use server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getProducts() {
  const res = await fetch(`${API_URL}/products`, {
    cache: 'no-store'
  })
  return res.json()
}
```

```typescript
// apps/api/src/products/products.controller.ts
import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Controller('products')
export class ProductsController {
  constructor(private prisma: PrismaService) {}
  
  @Get()
  async findAll() {
    return this.prisma.product.findMany()
  }
}
```

## Key Files

- **.env**: Root environment file with DATABASE_URL
- **apps/api/src/prisma/**: Prisma module (PrismaService, PrismaModule)
- **packages/database/prisma/schema.prisma**: Database schema definition
- **packages/database/.env**: Database configuration (backup copy)
- **apps/web/src/lib/utils.ts**: Utility functions (cn, tailwind merge)
- **apps/web/src/app/providers.tsx**: App providers (ThemeProvider, SidebarProvider)
- **apps/api/package.json**: API scripts (start uses ts-node)

## Troubleshooting

### API won't start
- Make sure `.env` exists in project root with `DATABASE_URL`
- Run `npx prisma generate` to regenerate the Prisma Client
- Check if port 3001 is already in use: `netstat -ano | grep 3001`

### Database connection fails
- Verify `DATABASE_URL` in `.env` is correct
- Check PostgreSQL server is accessible
- Ensure database `ecommerce-Oaxaca` exists

### Build errors
- The API uses `ts-node` for development, not compiled code
- Run `npm run build` to compile TypeScript if needed for production
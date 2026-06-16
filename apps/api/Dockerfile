# API (NestJS) — build desde la RAÍZ del monorepo:
#   docker build -f apps/api/Dockerfile -t marketplace-api .
# (o vía docker-compose.prod.yml, que ya fija el context correcto).

FROM node:22-alpine AS base
WORKDIR /app
# openssl/libc6-compat son requeridos por el engine de Prisma en Alpine.
RUN apk add --no-cache libc6-compat openssl

# --- deps: instala todo el workspace con el lockfile ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci

# --- build: genera el cliente Prisma y compila la API ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build:api

# --- runner: imagen final mínima ---
FROM base AS runner
ENV NODE_ENV=production
# node_modules incluye el cliente Prisma generado en la etapa build.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/database ./packages/database
WORKDIR /app/apps/api
EXPOSE 3001
# Las variables (DATABASE_URL, JWT_*, STRIPE_*, CORS_ORIGINS, etc.) se inyectan por entorno.
CMD ["node", "dist/main"]

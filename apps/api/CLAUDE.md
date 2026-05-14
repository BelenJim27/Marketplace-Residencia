# API (NestJS 11) - Marketplace-Residencia

Ubicación: `apps/api/`

## Estructura de Módulos (24 módulos)

### Auth & Usuarios
| Módulo | Responsabilidad | Clave |
|--------|-----------------|-------|
| **auth** | JWT manual + OAuth Google | `src/auth/auth.guard.ts`, `src/auth/oauth.controller.ts` |
| **usuarios** | Perfiles, CRUD de usuarios | Vinculado a `roles` |
| **roles** | RBAC, definiciones de roles | Datos base para autorización |
| **productores** | Perfiles de productores, flujo de onboarding | Estados: pending, approved, rejected |

### Marketplace Core
| Módulo | Responsabilidad | Clave |
|--------|-----------------|-------|
| **productos** | Catálogo de productos | Vinculado a `categorias`, `productores` |
| **categorias** | Categorías jerárquicas | Parent-child relationship |
| **tiendas** | Gestión de tiendas | 1 tienda por productor |
| **lotes** | Lotes/partidas de productor | Trazabilidad de producción |
| **inventario** | Niveles de stock | Vinculado a `productos` y `lotes` |

### Pedidos & Carrito
| Módulo | Responsabilidad | Clave |
|--------|-----------------|-------|
| **carrito** | Shopping cart | Items almacenados en BD |
| **pedidos** | Ciclo de vida de órdenes | Estados: pending, processing, shipped, delivered |
| **pagos** | Registros de pagos | Integración con gateway (preparar) |
| **envios** | Tracking de envíos | Vinculado a `transportistas` |
| **transportistas** | Gestión de carriers | Para asignar a envíos |

### User Experience
| Módulo | Responsabilidad | Clave |
|--------|-----------------|-------|
| **wishlist** | Items guardados | Vinculado a `productos` |
| **resenas** | Reviews de productos | Rating 1-5 |
| **direcciones** | Direcciones de entrega | Múltiples por usuario |
| **notificaciones** | Notificaciones in-app | Desencadenadas por eventos |

### Admin & Configuración
| Módulo | Responsabilidad | Clave |
|--------|-----------------|-------|
| **admin** | Operaciones solo admin | Dashboard, estadísticas, moderación |
| **configuracion** | Configuración del sistema | Settings globales |
| **auditoria** | Audit logs | Todos los cambios de datos |

### Utilidades
| Módulo | Responsabilidad | Clave |
|--------|-----------------|-------|
| **email** | SendGrid email delivery | `src/modules/email/email.service.ts` |
| **archivos** | File upload/storage | Carpetas: `/uploads/productos`, `/usuarios`, `/archivos` |
| **estadisticas-landing** | Stats para landing page | Datos públicos |

---

## Patrones Clave

### Auth Flow
```typescript
// JWT manual (sin jsonwebtoken library)
// Access token: 15m
// Refresh token: 30d
// En src/auth/auth.service.ts

// OAuth Google callback
// GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback/google
```

### Guards (Orden de aplicación)
```typescript
@UseGuards(AuthGuard)         // Valida bearer token en Authorization header
@UseGuards(RbacGuard)         // Valida role del usuario
@Roles(Role.ADMIN)            // Especifica qué roles pueden acceder
```

### Database (Singleton Pattern)
```typescript
// src/prisma/prisma.service.ts wraps Prisma client
// Inyectado como `PrismaService`
// Después de cambios en schema: npm run db:generate (en raíz)
```

### BigInt Serialization
```typescript
// main.ts: BigInt.prototype.toJSON = function () { return Number(this); }
// Todos los IDs BigInt de BD → números en JSON responses
```

### File Uploads
```
apps/api/uploads/
├── productos/      # Imágenes de productos
├── usuarios/       # Avatares
└── archivos/       # Documentos generales
```
Servidos en `/uploads/{tipo}/{filename}` por Express static middleware.

### Validation
```typescript
// Global ValidationPipe en main.ts
@UsePipes(new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true }
}))
// Class-validator en DTOs
```

### Email
```typescript
// SendGrid via src/modules/email/email.service.ts
// SENDGRID_API_KEY en .env
// EMAIL_FROM en .env
```

---

## Desarrollo Rápido

### Crear nuevo módulo
```bash
nest g module modules/nuevo-modulo
nest g controller modules/nuevo-modulo
nest g service modules/nuevo-modulo
```

### Testing
```bash
# Un archivo específico
npm run test -- src/modules/auth/auth.service.spec.ts --no-coverage

# Con watch
npm run test:watch

# Coverage completo
npm run test:cov
```

### Base de datos
```bash
# Schema cambió en packages/database/prisma/schema.prisma
npm run db:migrate    # Crea archivo de migración
npm run db:push       # Push sin migración (dev only)
npm run db:generate   # Regenera Prisma client (SIEMPRE después de cambios)
npx prisma studio    # UI visual de la BD
```

### Seeding (demos)
```bash
node scripts/seed-roles.js
node scripts/seed-usuarios.js
```

---

## Flujos Comunes

### Login con Email/Password
```
POST /auth/login
→ auth.service.login()
→ Genera JWT access + refresh tokens
→ Returns { accessToken, refreshToken, usuario }
```

### Login con Google
```
GET /auth/callback/google?code=...
→ oauth.controller.callback()
→ Exchange code por Google tokens
→ Upsert oauth_cuentas en BD
→ Genera JWT propios
```

### Crear Producto
```
POST /productos { nombre, descripcion, ... }
→ Validación DTOs
→ Guard: AuthGuard + RbacGuard + @Roles(PRODUCTOR, ADMIN)
→ productos.service.create()
→ Prisma create
→ Return producto con IDs como números
```

### Agregar al Carrito
```
POST /carrito/agregar { productoId, cantidad }
→ AuthGuard (usuario autenticado)
→ carrito.service.agregarItem()
→ Upsert en carrito_item
```

---

## Imports Críticos

```typescript
// Prisma (desde packages/database)
import { PrismaClient } from '@marketplace-residencia/database';

// Custom guards
import { AuthGuard } from '@/auth/auth.guard';
import { RbacGuard } from '@/auth/rbac.guard';

// Decoradores
import { Roles } from '@/auth/roles.decorator';
import { CurrentUser } from '@/auth/current-user.decorator';
```

---

## Archivos Clave

- `src/main.ts` - Bootstrap, global pipes/filters, middleware
- `src/app.module.ts` - Root module con imports
- `src/prisma/prisma.service.ts` - Database singleton
- `src/auth/auth.service.ts` - JWT generation (manual)
- `src/auth/auth.guard.ts` - Bearer token validation
- `src/auth/rbac.guard.ts` - Role checking
- `src/modules/email/email.service.ts` - SendGrid integration

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| "Prisma client not found" | Ejecuta `npm run db:generate` desde raíz |
| "JWT verification failed" | Check `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` en .env |
| "CORS error" | Verifica `FRONTEND_URL` en .env (debe ser tu Next.js URL) |
| BigInt serialization error | Check que `main.ts` tiene `BigInt.prototype.toJSON` |
| File upload 404 | Verifica que Express static middleware está en `main.ts` |

# Sistema de Autenticación

## Resumen General

Este documento describe cómo funciona el sistema de autenticación en el proyecto Marketplace-Residencia, tanto en el backend (NestJS) como en el frontend (Next.js + NextAuth).

---

## Backend (NestJS)

### Endpoints disponibles

| Método | Endpoint | Descripción |
|-------|----------|-------------|
| POST | `/auth/register` | Registro de nuevo usuario |
| POST | `/auth/login` | Inicio de sesión |
| GET | `/auth/me` | Obtener datos del usuario actual |
| POST | `/auth/refresh` | Renovar tokens |
| POST | `/auth/logout` | Cerrar sesión |
| POST | `/auth/password-reset/request` | Solicitar recuperación de contraseña |
| POST | `/auth/password-reset/confirm` | Confirmar nueva contraseña |
| POST | `/auth/oauth/google` | Login con Google OAuth |

### Flujo de autenticación

#### Registro

1. El usuario envía email, contraseña y datos personales
2. La contraseña se hashea usando **scrypt** (iteraciones: 16384)
3. Se crea el usuario en la base de datos
4. Se envía email de bienvenida
5. Se emite el par access_token + refresh_token

#### Login

1. El usuario envía email + contraseña
2. Se busca el usuario por email
3. Se verifica la contraseña hasheada contra la almacenada (soporta bcrypt legacy)
4. Se genera el par de tokens y se almacena el hash del refresh_token en BD
5. Se retorna el usuario con roles y permisos

#### Recuperación de contraseña

1. Usuario solicita recuperación con su email
2. Se genera un JWT especial (`password_reset`) con expiry 30 min
3. Se envía email con el token
4. Usuario envía token + nueva contraseña
5. Se actualiza la contraseña y se incrementa `version_token` (invalida todos los tokens anteriores)

### Tokens JWT (implementación manual)

El sistema implementa JWT manualmente usando **HMAC-SHA256** (no usa jsonwebtoken library).

#### Access Token

- **Expira:** 15 minutos
- **Contenido:**
  ```json
  {
    "sub": "id_usuario",
    "email": "user@example.com",
    "version_token": 1,
    "token_type": "access",
    "roles": ["admin", "productor"],
    "permisos": ["ver_productos", "editar_productos"],
    "id_productor": 123
  }
  ```

#### Refresh Token

- **Expira:** 30 días
- **Contenido:**
  ```json
  {
    "sub": "id_usuario",
    "version_token": 1,
    "token_type": "refresh",
    "jti": "uuid-unico"
  }
  ```

#### Password Reset Token

- **Expira:** 30 minutos
- **Contenido:**
  ```json
  {
    "sub": "id_usuario",
    "token_type": "password_reset",
    "jti": "uuid-unico"
  }
  ```

### Versionamiento de tokens

El campo `version_token` en la tabla de usuarios permite invalidar todos los tokens existentes cuando el usuario cambia su contraseña. Cada vez que se cambia la contraseña, se incrementa este valor, haciendo que todos los tokens previos deven sean inválidos.

### Protección de rutas

El `AuthGuard` verifica el access_token en el header Authorization:

```
Authorization: Bearer <access_token>
```

Extrae los datos del usuario (id, email, roles, permisos, id_productor) y los inyecta en `request.user`.

### Contraseñas

- Nuevas contraseñas: hasheadas con **scrypt** (N=16384, r=8, p=1)
- Contraseñas legacy: soportan **bcrypt** ($2b$ / $2a$)

---

## Frontend (Next.js + NextAuth)

### Providers configurados

1. **Google OAuth** - Login con cuenta Google
2. **Credentials** - Login con email/contraseña local

### Flujo de autenticaci��n

#### Login con credenciales

1. El formulario envía credenciales al backend (`/auth/login`)
2. NextAuth recibe los tokens y los almacena en el JWT de la sesión
3. Los callbacks transfieren accessToken y refreshToken al token JWT
4. Los datos del usuario se exponen en la sesión

#### Login con Google

1. Usuario se autentica con Google (OAuth flow)
2. En el callback `jwt`, se envía el token de Google al backend (`/auth/oauth/google`)
3. El backend crea/actualiza el usuario en la base de datos
4. El backend retorna tokens propios (access + refresh)
5. NextAuth almacena los nuevos tokens en el JWT

#### Renovación automática de tokens

En el callback `jwt`, si el token expira en menos de 60 segundos, se llama automáticamente a `/auth/refresh` para obtener nuevos tokens.

### Hook useAuth

El hook `useAuth` proporciona acceso al estado de autenticación:

```typescript
const { user, hasRole, hasPermiso, logout, isAdmin, isProductor } = useAuth();
```

---

## Archivos del Sistema

### Backend

| Archivo | Ruta | Propósito |
|---------|------|-----------|
| `auth.controller.ts` | `apps/api/src/modules/auth/` | Define los endpoints REST |
| `auth.service.ts` | `apps/api/src/modules/auth/` | Lógica de autenticación |
| `auth.module.ts` | `apps/api/src/modules/auth/` | Registro del módulo |
| `dto/auth.dto.ts` | `apps/api/src/modules/auth/` | DTOs con validaciones |
| `guards/auth.guard.ts` | `apps/api/src/modules/auth/` | Protege rutas privadas |
| `oauth.service.ts` | `apps/api/src/modules/auth/` | Lógica OAuth Google |
| `oauth.controller.ts` | `apps/api/src/modules/auth/` | Endpoint OAuth |

### Frontend

| Archivo | Ruta | Propósito |
|---------|------|-----------|
| `lib/auth.ts` | `apps/web/src/` | Configuración NextAuth |
| `hooks/use-auth.ts` | `apps/web/src/` | Hook para acceder al usuario |
| `types/next-auth.d.ts` | `apps/web/src/` | Tipos de NextAuth |
| `context/AuthContext.tsx` | `apps/web/src/` | Context API |

### Detalles de auth.service.ts

Funciones principales:

- `register(dto)` - Crea usuario con contraseña hasheada
- `login(dto)` - Verifica credenciales y emite tokens
- `refresh(dto)` - Renueva tokens con refresh_token
- `logout(dto)` - Revoca refresh_token
- `requestPasswordReset(dto)` - Solicita recuperación
- `resetPassword(dto)` - Resetea la contraseña
- `getMe(token)` - Retorna datos del usuario actual
- `issueTokens(user)` - Genera access + refresh tokens

### Detalles de lib/auth.ts

Configuración principal:

- Providers: Google + Credentials
- Session strategy: JWT con maxAge 24h
- Callbacks:
  - `signIn` - Validación post-login
  - `jwt` - Manejo de tokens, refresh, OAuth
  - `session` - Exposición de datos en sesión
  - `redirect` - Redirecciones post-login

---

## Diagrama del flujo

```
Frontend                              Backend                              BD
    |                                    |                                |
    |-- POST /auth/login (email,pass) --> |                                |
    |                                    |-- buscar usuario --------->|
    |                                    |-- verificar password ----->|
    |                                    |-- generar tokens --------->|
    |                                    |-- guardar refresh_hash --->|
    |<-- { user, tokens } ----------------|                                |
    |                                    |                                |
    |-- solicitud con Bearer token ----->|                                |
    |                                    |-- extraer user de token ----->|
    |<-- datos del usuario ---------------|                                |
```

---

---

## Esquema de Rutas (Frontend)

### Estructura Actual (con problemas)

```
app/
├── page.tsx                          # Mezclado con otras rutas
├── (home)/                           # Route group sin uso claro
├── auth/
│   ├── sign-in/
│   ├── sign-up/
│   ├── forgot-password/              # ❌ Nombre largo
│   ├── reset-password/
│   ├── callback/
│   └──/
├── profile/                         # Necesita layout
├── Cliente/                        # Mezcla español/inglés
│   └── producto/
├── Administrador/                  # Mezcla español
│   ├── usuarios/                   # Falta "s" en algunas rutas
│   ├── usuarioss/                  # ❌ Doble "s" (error)
│   ├── dashboard/
│   ├── tienda/
│   └── ...
├── dashboard/productor/            # Anidado diferente
├── tienda/
├── tables/                         # Demos sueltas
└── ui-elements/
```

> ⚠️ **Nota**: La reorganización con Route Groups `(public)`, `(auth)`, etc. no es viable en Windows NTFS debido a problemas con paréntesis en nombres de carpetas. Se recomienda usar Linux/macOS o un sistema de archivos que soporte esto. La estructura actual funciona correctamente.

### Estructura Recomendada (para Linux/macOS)

La estructura propuesta sigue las Mejores Prácticas de Next.js:

```
app/
├── (public)/                        # Route group: rutas públicas (sin auth)
│   ├── page.tsx                    # Home / Landing
│   ├── auth/
│   │   ├── sign-in/
│   │   │   └── page.tsx           # /auth/sign-in
│   │   ├── sign-up/
│   │   │   └── page.tsx           # /auth/sign-up
│   │   ├── forgot-password/        # /auth/forgot-password
���   │   │   └── page.tsx
│   │   ├── reset-password/        # /auth/reset-password
│   │   │   └── page.tsx
│   │   ├── callback/              # /auth/callback (OAuth)
│   │   │   └── page.tsx
│   │   └── layout.tsx             # Layout auth (opcional)
│   ├── products/
│   │   ├── page.tsx               # /products (catálogo)
│   │   └── [id]/
│   │       └── page.tsx            # /products/[id]
│   └── error.tsx                  # Error boundary
│
├── (auth)/                         # Route group: requiere autenticación
│   ├── layout.tsx                # Layout con nav/sidebar
│   ├── profile/
│   │   ├── page.tsx              # /profile
│   │   └── layout.tsx
│   ├── shop/                     # Cliente: tienda
│   │   ├── wishlist/             # /shop/wishlist
│   │   │   └── page.tsx
│   │   ├── cart/                 # /shop/cart
│   │   │   └── page.tsx
│   │   └── orders/               # /shop/orders
│   │       └── page.tsx
│   └── suppliers/
│       └── [id]/                 # /suppliers/[id] (ver productor)
│           └── page.tsx
│
├── (dashboard)/                  # Route group: dashboards por rol
│   ├── layout.tsx               # Layout base dashboard
│   ├── admin/                 # Administrador
│   │   ├── layout.tsx         # Layout admin con sidebar
│   │   ├── page.tsx          # /dashboard/admin
│   │   ├── users/           # /dashboard/admin/users
│   │   │   └── page.tsx
│   │   ├── user-roles/       # /dashboard/admin/user-roles
│   │   │   └── page.tsx
│   │   ├── roles/            # /dashboard/admin/roles
│   │   │   └── page.tsx
│   │   ├── permissions/      # /dashboard/admin/permissions
│   │   │   └── page.tsx
│   │   ├── role-permissions/ # /dashboard/admin/role-permissions
│   │   │   └── page.tsx
│   │   ├── store/           # /dashboard/admin/store
│   │   │   ├── page.tsx
│   │   │   └── producers/
│   │   │       └── page.tsx
│   │   ├── products/        # /dashboard/admin/products
│   │   │   └── page.tsx
│   │   ├── orders/         # /dashboard/admin/orders
│   │   │   └── page.tsx
│   │   ├── inventory/      # /dashboard/admin/inventory
│   │   │   └── page.tsx
│   │   ├── certifications/ # /dashboard/admin/certifications
│   │   │   ├── page.tsx
│   │   │   └── config/
│   │   │       └── page.tsx
│   │   ├── validate-certs/ # /dashboard/admin/validate-certs
│   │   │   └── page.tsx
│   │   ├── audit/          # /dashboard/admin/audit
│   │   │   └── page.tsx
│   │   └── settings/      # /dashboard/admin/settings
│   │       └── page.tsx
│   ├── producer/          # Productor
│   │   ├── layout.tsx     # Layout producer
│   │   ├── page.tsx      # /dashboard/producer
│   │   ├── profile/      # /dashboard/producer/profile
│   │   │   └── page.tsx
│   │   ├── products/      # /dashboard/producer/products
│   │   │   └── page.tsx
│   │   ├── store/         # /dashboard/producer/store
│   │   │   └── page.tsx
│   │   ├── lots/          # /dashboard/producer/lots
│   │   │   └── page.tsx
│   │   ├── files/         # /dashboard/producer/files
│   │   │   └── page.tsx
│   │   │   └── nom070/
│   │   │       └── page.tsx
│   │   └── sales/         # /dashboard/producer/sales
│   │       └── page.tsx
│   └── customer/          # Cliente (opcional)
│
├── (dev)/                      # Route group: demos (solo dev)
│   ├── tables/
│   │   └── page.tsx
│   ├── ui/
│   │   ├── buttons/
│   │   │   └── page.tsx
│   │   └── alerts/
│   │       └── page.tsx
│   └── layout.tsx              # Layout específico para demos
│
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts         # NextAuth API route
```

### Principios Aplicados

1. **Route Groups** `(nombre)`: Permiten compartir layouts y agrupar rutas lógicamente
2. **Nombrado en inglés consistente**: Nombres técnicos en inglés
3. **Agrupación por contexto**:
   - `(public)` - anyone
   - `(auth)` - authenticated
   - `(dashboard)` - role-based
   - `(dev)` - development only
4. **Nombres cortos y claros**: `users` no `usuarios`, `admin` no `administrador`
5. **Anidación consistente**: Todos los dashboards bajo `/dashboard/`
6. **Demos aislados**: En route group separado, fácil de remove en prod

### Mapeo de Rutas Actuales vs Recomendadas

| Ruta Actual | Ruta Propuesta |
|------------|---------------|
| `/auth/sign-in` | `/auth/sign-in` |
| `/auth/sign-up` | `/auth/sign-up` |
| `/profile` | `(auth)/profile` |
| `/Cliente/producto` | `(public)/products` |
| `/tienda/carrito` | `(auth)/shop/cart` |
| `/tienda/deseos` | `(auth)/shop/wishlist` |
| `/tienda/compras` | `(auth)/shop/orders` |
| `/Administrador/dashboard` | `(dashboard)/admin` |
| `/Administrador/usuarios` | `(dashboard)/admin/users` |
| `/Administrador/roles` | `(dashboard)/admin/roles` |
| `/dashboard/productor` | `(dashboard)/producer` |
| `/tables` | `(dev)/tables` |
| `/ui-elements` | `(dev)/ui` |

---

## Variables de entorno

### Backend

| Variable | Descripción |
|----------|-------------|
| `JWT_ACCESS_SECRET` | Secret para access tokens |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |
| `PASSWORD_RESET_SECRET` | Secret para reset tokens |
| `JWT_ACCESS_EXPIRES_IN` | Duración access token (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | Duración refresh token (default: 30d) |

### Frontend

| Variable | Descripción |
|----------|-------------|
| `NEXTAUTH_SECRET` | Secret para NextAuth |
| `NEXT_PUBLIC_API_URL` | URL del API |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret Google OAuth |
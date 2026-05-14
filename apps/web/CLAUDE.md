# Web (Next.js 16 App Router) - Marketplace-Residencia

**Ubicación**: `apps/web/src/`  
**Estado**: Estructura verificada contra App Router

---

## Estructura de Rutas (App Router)

### Rutas Públicas (sin autenticación)
```
app/
├── (home)/
│   └── page.tsx              # Landing page
├── categoria/
│   ├── page.tsx              # Listado
│   └── [id]/page.tsx         # Productos en categoría
├── producto/
│   ├── page.tsx              # Catálogo
│   └── [id]/page.tsx         # Detalle
└── tienda/
    ├── page.tsx              # Listado de tiendas
    └── [id]/page.tsx         # Tienda específica
```

**Header usado**: `TiendaHeader` (sin sidebar)

### Rutas de Autenticación
```
app/auth/
├── login/page.tsx            # Email/password
├── registro/page.tsx         # Sign up
├── reset-password/page.tsx   # Recuperar contraseña
└── callback/page.tsx         # OAuth callback
```

**Header usado**: `TiendaHeader` (sin sidebar)

### Cliente Estándar
```
app/Cliente/
├── dashboard/page.tsx
├── pedidos/page.tsx          # Mis órdenes
├── pedidos/[id]/page.tsx     # Detalle
├── wishlist/page.tsx         # Favoritos
├── perfil/page.tsx           # Mi perfil
└── direcciones/page.tsx      # Mis direcciones
```

**Header usado**: `TiendaHeader` (sin sidebar)

### Productor (Tiendero)
```
app/Productor/
├── dashboard/page.tsx
├── productos/page.tsx
├── productos/[id]/edit/page.tsx
├── productos/crear/page.tsx
├── lotes/page.tsx
├── lotes/crear/page.tsx
├── pedidos/page.tsx
├── tienda/page.tsx
└── perfil/page.tsx
```

**Header usado**: `Sidebar + Header`

### Administrador
```
app/Administrador
├── dashboard/page.tsx
├── usuarios/page.tsx
├── usuarios/[id]/page.tsx
├── productores/page.tsx
├── productores/[id]/page.tsx
├── productos/page.tsx
├── pedidos/page.tsx
├── tiendas/page.tsx
├── categorias/page.tsx
├── configuracion/page.tsx
└── auditoria/page.tsx
```

**Header usado**: `Sidebar + Header`

---

## Selección de Layout (root-content.tsx)

Verificar que **cada ruta** tenga el layout correcto:

### ✅ Validar TiendaHeader (sin sidebar)
- [ ] /auth/*
- [ ] /tienda/*
- [ ] /Cliente/*
- [ ] / (home)
- [ ] /producto*
- [ ] /categoria*

### ✅ Validar Sidebar + Header
- [ ] /Administrador* (si user.role === ADMIN)
- [ ] /Productor/* (si user.role === PRODUCTOR)

### ✅ Validar TiendaHeader (para otros autenticados)
- [ ] Cualquier otro usuario autenticado sin rol admin/productor

---

## Componentes Clave (Estructura)

### Layouts
- [ ] TiendaHeader - Navbar sin sidebar
- [ ] Sidebar - Sidebar para admin/productor
- [ ] AdminLayout - Wrapper para admin pages
- [ ] ProductorLayout - Wrapper para productor pages

### Por Rol
- [ ] components/Administrator/* - Admin-only components
- [ ] components/Producer/* - Productor-only components
- [ ] components/Cliente/* - Cliente-only components
- [ ] components/Products/* - Product display
- [ ] components/catalog/* - Browsing

### Shared
- [ ] components/FormElements/* - Inputs, selects
- [ ] components/shadcn/* - shadcn/ui components
- [ ] components/ui/* - Custom UI

---

## API Client & Proxy (next.config.mjs)

### ✅ Proxy Rewrites Verificadas
- [ ] /uploads/* → http://localhost:3001/uploads
- [ ] /inventario/* → http://localhost:3001/inventario
- [ ] /productos/* → http://localhost:3001/productos
- [ ] /productores/* → http://localhost:3001/productores
- [ ] /pedidos/* → http://localhost:3001/pedidos
- [ ] /categorias/* → http://localhost:3001/categorias

### ✅ Direct Calls (Sin Proxy)
Estos endpoints en `src/lib/api.ts` van directo a `NEXT_PUBLIC_API_URL`:
- [ ] POST /auth/login
- [ ] POST /auth/register
- [ ] POST /auth/refresh
- [ ] GET /auth/callback/google
- [ ] POST /auth/logout

### ✅ Token Refresh (Deduplication)
- [ ] Singleton pattern para evitar múltiples refresh simultáneos
- [ ] Si 401: hacer refresh UNA VEZ y reintentar

---

## Auth (Dual-Mode)

### Email/Password Flow
- [ ] POST /auth/login { email, password }
- [ ] Almacenar token, refresh_token en cookies
- [ ] Almacenar usuario en cookie/context
- [ ] AuthContext populate desde cookies

### Google OAuth Flow
- [ ] NextAuth.js integration
- [ ] Google consent screen
- [ ] Backend intercambia code por tokens
- [ ] NextAuth session + cookies + AuthContext synced

### AuthContext
Verificar que proporciona:
- [ ] user (actual usuario)
- [ ] token (JWT access)
- [ ] refreshToken
- [ ] logout()
- [ ] isLoading

---

## Internacionalización (i18n)

### Config (src/i18n/routing.ts)
- [ ] locales: ['es', 'en']
- [ ] defaultLocale: 'es'

### Uso en Componentes
- [ ] useTranslations() hook
- [ ] t('key') para traducir
- [ ] Fallback a español si idioma no existe

### Archivos
- [ ] src/i18n/locales/es.json
- [ ] src/i18n/locales/en.json

---

## Theming (Dark/Light)

### next-themes
- [ ] Provider en src/providers.tsx
- [ ] Toggle en header
- [ ] localStorage para persistencia
- [ ] useTheme() hook en componentes

---

## Provider Order (src/providers.tsx)

Verificar que está en orden correcto:
```
SessionProvider (NextAuth)
  ↓
ThemeProvider (Dark/light)
  ↓
AuthProvider (Email/OAuth dual-mode)
  ↓
CarritoProvider (Shopping cart state)
  ↓
WishlistProvider (Saved items)
  ↓
ConfigProvider (System config)
  ↓
SidebarProvider (Sidebar toggle)
```

---

## Validaciones (Verificar)

- [ ] Edad mínima (si producto requiere)
- [ ] Restricciones de envío (por país/estado)
- [ ] Stock disponible en carrito
- [ ] Email formato
- [ ] Datos de dirección completos

---

## Environment Variables (Validar)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Desarrollo Rápido

### Crear página autenticada
```bash
# 1. Crear app/Rol/nueva-seccion/page.tsx
# 2. Importar layout en layout.tsx
# 3. Wrappear con useAuth() para validar
# 4. Agregar en root-content.tsx si cambia layout
```

### Agregar traducción
```bash
# 1. Editar src/i18n/locales/es.json
# 2. Editar src/i18n/locales/en.json
# 3. Usar en componente: const t = useTranslations()
```

### Llamada al API
```bash
# Usar src/lib/api.ts (centralizado)
# Incluye token + refresh automático
```

---

## Estructura de Carpetas (Verificar)

```
src/
├── app/                    # App Router routes
├── components/
│   ├── Administrator/
│   ├── Producer/
│   ├── Cliente/
│   ├── Layouts/
│   ├── Products/
│   ├── catalog/
│   ├── FormElements/
│   ├── shadcn/
│   └── ui/
├── context/
├── hooks/
├── lib/
│   └── api.ts
├── i18n/
├── types/
└── css/
```

---

## Troubleshooting Checklist

- [ ] Auth no persiste → Check cookies en DevTools
- [ ] 401 en API → Token expirado, check refresh en api.ts
- [ ] Proxy 404 → Verificar next.config.mjs
- [ ] i18n no carga → Check imports, default locale
- [ ] Sidebar no aparece → Check role en AuthContext + root-content.tsx
- [ ] Dark mode no persiste → Check next-themes provider order
- [ ] Google OAuth error → Check NEXTAUTH_SECRET + callbacks

---

## Archivos Clave

- `src/app/layout.tsx` - Root layout
- `src/app/root-content.tsx` - Layout selection logic
- `src/lib/api.ts` - Centralized API client
- `src/context/AuthContext.tsx` - Auth state (dual-mode)
- `src/i18n/routing.ts` - i18n config
- `src/providers.tsx` - Provider order
- `next.config.mjs` - Proxy rewrites

---

## Estado: ✅ ESTRUCTURA VERIFICADA

Esta checklist verifica que tu frontend tiene toda la estructura necesaria.

**Próximo paso**: Ir por cada sección y checkear que está implementada.  
**Tokens**: Solo lees estructura, sin ejemplos de código.

# GUÍA DE PRUEBAS — Marketplace-Residencia
> Generado el 2026-06-06. Basado en análisis directo del código fuente.

---

## 1. Instalación del Proyecto

### Prerequisitos

- Node.js 20+ (recomendado 22 LTS)
- npm 10+
- PostgreSQL (o cuenta en Neon.tech)
- Cuenta Stripe (modo test)
- Cuenta PayPal (sandbox)
- Cuenta SkydropX (sandbox)
- Cuenta SendGrid

### Pasos de Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd Marketplace-Residencia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# 4. Editar .env y apps/api/.env con tus valores reales

# 5. Generar cliente Prisma
npm run db:generate

# 6. Ejecutar migraciones
cd packages/database && npx prisma migrate deploy && cd ../..

# 7. Ejecutar seeds de datos base
cd apps/api
node scripts/seed-base.js
node scripts/seed-internacionalizacion.js
node scripts/seed-restricciones-usa.js
cd ../..

# 8. Iniciar en modo desarrollo
npm run dev
```

---

## 2. Variables de Entorno Requeridas

### Root `.env` y `apps/api/.env`

```env
# ─── Base de datos ───────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require

# ─── Servidores ──────────────────────────────────────────────
PORT=3001
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

# ─── NextAuth ────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secreto_aleatorio_32_chars

# ─── JWT ─────────────────────────────────────────────────────
JWT_ACCESS_SECRET=tu_access_secret_muy_largo
JWT_REFRESH_SECRET=tu_refresh_secret_muy_largo
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PASSWORD_RESET_SECRET=tu_reset_secret_muy_largo

# ─── Google OAuth ─────────────────────────────────────────────
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback/google

# ─── Email ────────────────────────────────────────────────────
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@tudominio.com

# ─── Stripe ───────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_xxx       # ← sk_test_ para pruebas
STRIPE_WEBHOOK_SECRET=whsec_xxx     # ← de Stripe Dashboard > Webhooks

# ─── PayPal ───────────────────────────────────────────────────
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx               # ← de PayPal Developer Portal
PAYPAL_ENV=sandbox                  # sandbox | live

# ─── SkydropX ─────────────────────────────────────────────────
SKYDROPX_CLIENT_ID=xxx
SKYDROPX_CLIENT_SECRET=xxx
SKYDROPX_ENV=sandbox                # sandbox | production
SKYDROPX_SHIPPER_NAME=Nombre Empresa
SKYDROPX_SHIPPER_PHONE=9511234567
SKYDROPX_SHIPPER_EMAIL=envios@tuempresa.mx
SKYDROPX_SHIPPER_STREET=Calle Principal 123
SKYDROPX_SHIPPER_POSTAL_CODE=68000
SKYDROPX_SHIPPER_STATE=Oaxaca
SKYDROPX_SHIPPER_CITY=Oaxaca de Juárez
SKYDROPX_SHIPPER_COLONIA=Centro

# ─── Tasas de cambio ──────────────────────────────────────────
EXCHANGERATE_API_KEY=xxx            # optional, https://www.exchangerate-api.com
```

### Variables NEXT_PUBLIC (solo web)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_PAYPAL_CLIENT_ID=xxx
```

---

## 3. Usuarios de Prueba

### Crear usuarios de prueba (después del seed)

```bash
# El seed-base.js crea roles: admin, productor, cliente
# Los scripts de seed de usuarios están en scripts/

# Verificar que existen roles
psql $DATABASE_URL -c "SELECT * FROM roles;"
```

### Crear manualmente vía API

```bash
# 1. Registrar admin
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Admin","apellido_paterno":"Test","email":"admin@test.com","password":"Admin1234!"}'

# 2. Promover a admin (via Prisma Studio o SQL)
psql $DATABASE_URL -c "
  INSERT INTO usuario_rol (id_usuario, id_rol)
  SELECT u.id_usuario, r.id_rol 
  FROM usuarios u, roles r 
  WHERE u.email='admin@test.com' AND r.nombre='admin';
"

# 3. Registrar cliente
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Cliente","apellido_paterno":"Test","email":"cliente@test.com","password":"Cliente1234!","fecha_nacimiento":"1990-01-15"}'

# 4. Registrar futuro productor
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Productor","apellido_paterno":"Test","email":"productor@test.com","password":"Prod1234!"}'
```

### Datos de prueba importantes

| Rol | Email | Password |
|-----|-------|---------|
| Admin | admin@test.com | Admin1234! |
| Cliente (mayor de 18) | cliente@test.com | Cliente1234! |
| Productor | productor@test.com | Prod1234! |

---

## 4. Datos de Prueba Requeridos

### Seed de comisión global (OBLIGATORIO antes de probar checkout)

```sql
-- Sin esto el checkout falla (Bug C-03)
INSERT INTO comisiones (alcance, porcentaje, prioridad, vigente_desde, activo)
VALUES ('global', 0.10, 100, NOW(), true);
```

### Seed de tasas de impuesto para México y USA

```sql
-- IVA México 16%
INSERT INTO tasas_impuesto (pais_iso2, tipo, nombre, tasa_porcentaje, vigente_desde, incluido_en_precio, activo)
VALUES ('MX', 'IVA', 'IVA México 16%', 0.16, CURRENT_DATE, false, true);

-- FET USA mezcal (ejemplo)
-- Requiere id_categoria del mezcal
INSERT INTO tasas_impuesto (pais_iso2, id_categoria, tipo, nombre, tasa_porcentaje, vigente_desde, incluido_en_precio, activo)
VALUES ('US', <id_categoria_mezcal>, 'FET', 'Federal Excise Tax USA', 0.1374, CURRENT_DATE, false, true);
```

### Verificar seeds disponibles

```bash
# Listar scripts de seed disponibles
ls apps/api/scripts/
# seed-base.js, seed-internacionalizacion.js, seed-restricciones-usa.js

node apps/api/scripts/seed-base.js
node apps/api/scripts/seed-internacionalizacion.js
node apps/api/scripts/seed-restricciones-usa.js
```

---

## 5. Cómo Crear un Pedido Completo

### Flujo paso a paso con curl

```bash
# Variables
API=http://localhost:3001
TOKEN=""  # se llena después del login

# ─── PASO 1: Login ────────────────────────────────────────────
RESPONSE=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@test.com","password":"Cliente1234!"}')
TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
echo "Token: $TOKEN"

# ─── PASO 2: Ver catálogo y elegir producto ───────────────────
curl -s "$API/productos?status=activo" | jq '.[0]'
PRODUCTO_ID=1  # ajustar según BD

# ─── PASO 3: Agregar al carrito ───────────────────────────────
USUARIO_ID=$(echo $RESPONSE | jq -r '.usuario.id_usuario')
curl -s -X POST $API/carrito \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id_usuario\":\"$USUARIO_ID\",\"id_producto\":$PRODUCTO_ID,\"cantidad\":1,\"precio_unitario_snapshot\":100}"

# ─── PASO 4: Crear pedido ─────────────────────────────────────
PEDIDO=$(curl -s -X POST $API/pedidos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"id_usuario\":\"$USUARIO_ID\",
    \"moneda\":\"MXN\",
    \"pais_destino_iso2\":\"MX\",
    \"direccion_envio_snapshot\":{
      \"codigo_postal\":\"06600\",
      \"pais\":\"MX\",
      \"ciudad\":\"Ciudad de México\",
      \"estado\":\"CDMX\"
    }
  }")
PEDIDO_ID=$(echo $PEDIDO | jq -r '.id_pedido')
echo "Pedido ID: $PEDIDO_ID"

# ─── PASO 5: Agregar detalle al pedido ────────────────────────
curl -s -X POST $API/pedidos/$PEDIDO_ID/detalles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id_producto\":$PRODUCTO_ID,\"cantidad\":1,\"precio_compra\":100,\"moneda_compra\":\"MXN\"}"

# ─── PASO 6: Cotizar envío ────────────────────────────────────
curl -s "$API/pedidos/$PEDIDO_ID/cotizar" \
  -H "Authorization: Bearer $TOKEN"

# ─── PASO 7: Crear PaymentIntent ──────────────────────────────
INTENT=$(curl -s -X POST $API/pagos/stripe/intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"id_pedido\":\"$PEDIDO_ID\",
    \"subtotal\":100,
    \"shipping_amount\":50,
    \"moneda\":\"MXN\",
    \"shipping_address\":{\"country\":\"MX\",\"postal_code\":\"06600\"},
    \"recipient_name\":\"Cliente Test\"
  }")
CLIENT_SECRET=$(echo $INTENT | jq -r '.clientSecret')
echo "Client Secret: $CLIENT_SECRET"

# ─── PASO 8: Confirmar pago en frontend con Stripe.js ──────
# Usar el clientSecret en el formulario de pago de Next.js
# Stripe Elements en /tienda/checkout
```

---

## 6. Cómo Simular Pagos

### Stripe — Tarjetas de Prueba

| Escenario | Número de tarjeta | CVC | Vencimiento |
|-----------|------------------|-----|-------------|
| Pago exitoso | `4242 4242 4242 4242` | Cualquiera | Fecha futura |
| Pago rechazado | `4000 0000 0000 0002` | Cualquiera | Fecha futura |
| Autenticación 3DS | `4000 0025 0000 3155` | Cualquiera | Fecha futura |
| Insuficiente fondos | `4000 0000 0000 9995` | Cualquiera | Fecha futura |

### PayPal — Cuentas Sandbox

En https://developer.paypal.com/dashboard/accounts (Sandbox):
- Crear cuenta de comprador sandbox
- Usar esas credenciales en el flujo de PayPal

---

## 7. Cómo Simular Webhooks

### Stripe CLI (método recomendado)

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Escuchar webhooks en desarrollo
stripe listen --forward-to localhost:3001/pagos/stripe/webhook

# Simular eventos específicos
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger account.updated

# Reenviar evento anterior
stripe events resend evt_xxx
```

### PayPal Webhooks — Simulador

```bash
# En PayPal Developer Portal:
# My Apps & Credentials → tu app → Webhooks → Simulate

# O usando ngrok para recibir webhooks reales en local:
ngrok http 3001
# Agregar URL de ngrok en PayPal Webhook settings
```

### Simular webhook directamente (solo para tests)

```bash
# ADVERTENCIA: Sin firma válida fallará. Solo útil si STRIPE_WEBHOOK_SECRET no está configurado
curl -X POST http://localhost:3001/pagos/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_sig" \
  -d '{"id":"evt_test","type":"payment_intent.succeeded","data":{"object":{"id":"pi_test","metadata":{"id_pedido":"1"}}}}'
```

---

## 8. Cómo Probar Envíos

### Cotizar envío nacional (México)

```bash
# Cotización vía API
curl -s "http://localhost:3001/pedidos/$PEDIDO_ID/cotizar" \
  -H "Authorization: Bearer $TOKEN"

# Resultado esperado:
# [{ "carrier": "dhl", "service": "EXPRESS", "precioTotal": 150.00, ... }]
```

### Cotizar envío internacional (USA)

```bash
# Pedido con dirección en USA
# El snapshot debe incluir pais=US y estado=TX (Texas)
```

### Verificar restricciones de envío a USA

```bash
curl -X POST http://localhost:3001/pedidos/validar-envio \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pais_iso2": "US",
    "estado_codigo": "UT",
    "items": [{ "id_producto": 1 }]
  }'
# Utah prohíbe envío directo de mezcal (si hay restricción en BD)
```

### Verificar guías generadas

```bash
# Después de pago completado
curl "http://localhost:3001/envios" \
  -H "Authorization: Bearer $TOKEN"
# Buscar envios con envio_guias.numero_guia populated
```

---

## 9. Cómo Probar Marketplace Multiproductor

### Setup

```bash
# 1. Registrar 2 productores
# 2. Cada productor solicita ser aprobado
# 3. Admin aprueba ambos
# 4. Cada productor crea su tienda y productos con stock

# Productor A: producto con precio=200
# Productor B: producto con precio=300
```

### Flujo multiproductor

```bash
# 1. Cliente agrega 1 producto de productor A y 1 de productor B al carrito
# 2. Crea pedido
# 3. Agrega detalles para ambos productos
#    → debe crear pedido_productor con 2 registros
# 4. Completa pago
# 5. Verificar distribución:
psql $DATABASE_URL -c "
  SELECT id_productor, subtotal_bruto, comision_marketplace, monto_neto_productor 
  FROM pedido_productor 
  WHERE id_pedido = <ID>;
"
# Esperar: Productor A tiene ~40% del subtotal (200/500), Productor B ~60% (300/500)

# 6. Cada productor cambia estado de su parte:
#    confirmado → preparando → enviado → entregado
# 7. Al marcar entregado, verificar payout creado:
psql $DATABASE_URL -c "SELECT * FROM payouts WHERE id_productor = <ID>;"
```

### Verificar envíos separados por productor

```bash
# Post-pago, verificar que hay 1 envío por productor
psql $DATABASE_URL -c "
  SELECT pp.id_productor, e.id_envio, e.estado, e.numero_rastreo
  FROM pedido_productor pp
  LEFT JOIN envios e ON e.id_envio = pp.id_envio
  WHERE pp.id_pedido = <ID>;
"
```

---

## 10. Acceso a Swagger (Documentación de API)

La API tiene documentación Swagger disponible:

```
http://localhost:3001/api/docs
```

Usar "Authorize" con `Bearer <token>` para probar endpoints autenticados directamente desde la interfaz.

---

## 11. Herramientas Útiles

### Prisma Studio (UI visual de BD)

```bash
cd packages/database
npx prisma studio
# Abre en http://localhost:5555
```

### Verificar logs de la API

```bash
# En desarrollo (npm run dev):
# Los logs se muestran en la terminal con prefijo [NestJS]
# Logs de pagos/envíos tienen prefijo [pagos], [envios], etc.
```

### Reset de BD para pruebas limpias

```bash
# ⚠ DESTRUYE TODOS LOS DATOS
psql $DATABASE_URL -c "
  TRUNCATE pagos, pedidos, detalle_pedido, pedido_productor, 
           carrito_item, lista_deseos_item, envios, envio_guias, 
           envio_cotizaciones, payouts, webhook_events_log CASCADE;
"
# Luego re-ejecutar seeds
```

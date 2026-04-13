# Configuración de SendGrid para Producción

## 📋 Requisitos

- Cuenta activa en SendGrid (https://sendgrid.com)
- API Key de SendGrid con permisos de "Mail Send"
- Email verificado en SendGrid (necesario para EMAIL_FROM)

## 🔧 Pasos de Configuración

### 1. Obtener la API Key de SendGrid

1. Ir a https://app.sendgrid.com/settings/api_keys
2. Hacer clic en "Create API Key"
3. Nombrar la clave (ej: "Marketplace Production")
4. Seleccionar permisos:
   - ✅ Mail Send (necesario)
5. Crear y copiar la clave (se mostrará UNA SOLA VEZ)

### 2. Verificar Email de Origen

1. Ir a https://app.sendgrid.com/settings/sender_auth/domain
2. Usar uno de estos métodos:
   - **Verificación de dominio** (recomendado para producción)
   - **Verificación de email** (más rápido, para testing)

### 3. Configurar Variables de Entorno

En tu archivo `.env` de producción, establecer:

```env
# Base de datos
DATABASE_URL="postgresql://user:password@host:5432/database_name"

# Frontend
FRONTEND_URL="https://tu-dominio.com"
NEXT_PUBLIC_API_URL="https://api.tu-dominio.com"
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="tu-secret-key-seguro"

# Backend
NODE_ENV="production"
PORT="3001"
JWT_ACCESS_SECRET="jwt-access-secret-key-prod"
JWT_REFRESH_SECRET="jwt-refresh-secret-key-prod"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# SendGrid (PRODUCCIÓN REAL)
SENDGRID_API_KEY="SG.tu-api-key-aqui"
EMAIL_FROM="noreply@tu-dominio.com"  # DEBE estar verificado en SendGrid

# OAuth (si lo usas)
GOOGLE_CLIENT_ID="tu-client-id"
GOOGLE_CLIENT_SECRET="tu-client-secret"
GOOGLE_REDIRECT_URI="https://api.tu-dominio.com/auth/callback/google"
```

## 🚀 Validación en Tiempo Real

El servicio de email ahora:

✅ **En Desarrollo (sin SENDGRID_API_KEY)**
- Los emails se simulan y aparecen en los logs
- Útil para testing local

✅ **En Producción (NODE_ENV="production")**
- Requiere obligatoriamente SENDGRID_API_KEY
- Lanza un error durante la inicialización si falta
- Envía realmente los emails a través de SendGrid

## 📧 Métodos de Email Disponibles

### 1. Email de Bienvenida
```typescript
await emailService.sendWelcomeEmail('user@example.com', 'Juan');
```

### 2. Email de Recuperación de Contraseña
```typescript
await emailService.sendPasswordResetEmail('user@example.com', 'token123');
```

### 3. Email de Confirmación de Orden
```typescript
await emailService.sendOrderConfirmationEmail(
  'user@example.com',
  'ORD-2024-001',
  299.99
);
```

## 🔒 Buenas Prácticas

1. **Nunca commitar API Keys** - Usar variables de entorno
2. **Usar diferentes claves** - Una para dev, otra para production
3. **Monitorear entregas** - En SendGrid dashboard ver estadísticas
4. **Logs detallados** - Todos los envíos se registran en consola

## ⚠️ Solución de Problemas

### Error: "SENDGRID_API_KEY is missing"
- Verificar que `.env` tiene la variable configurada
- En producción, esta variable es obligatoria
- Reiniciar el servidor después de actualizar `.env`

### Error: "SendGrid Error: Invalid email address"
- El EMAIL_FROM debe estar verificado en SendGrid
- Ir a Settings → Sender Authentication
- Verificar el dominio o email

### Emails no se envían
- Validar la API Key en https://app.sendgrid.com/settings/api_keys
- Verificar que el email destino sea válido
- Revisar los logs de SendGrid en el dashboard

## 📊 Monitoreo

Acceder a SendGrid Dashboard:
1. https://app.sendgrid.com
2. Ver estadísticas de entregas
3. Verificar bounces o quejas
4. Analizar tasas de apertura y clics

## 🔄 Alternativas Locales (para testing)

Si necesitas testing local sin SendGrid:
- El servicio sigue simulando en desarrollo
- Los emails aparecen en los logs solo
- Perfecto para testing sin costo

---

**Última actualización**: Abril 2024

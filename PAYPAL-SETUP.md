# Configurar PayPal - Guía Rápida

## 🚀 Pasos para Habilitar PayPal

### 1️⃣ Obtener Credenciales de Sandbox

1. Ve a **https://sandbox.paypal.com**
2. Inicia sesión con tu cuenta PayPal (crea una si no tienes)
3. En el menú superior derecho, haz clic en **Configuración** (⚙️)
4. En el menú izquierdo, ve a **Apps & Credentials**
5. Asegúrate de estar en la pestaña **Sandbox** (arriba a la izquierda)

### 2️⃣ Crear/Encontrar una Aplicación

En la sección **Apps & Credentials > Sandbox**:

1. Si no hay aplicaciones listadas:
   - Haz clic en **Create App**
   - Dale un nombre (ej: "Marketplace Residencia")
   - Haz clic en **Create App**

2. Si ya hay aplicaciones:
   - Selecciona la que quieres usar o crea una nueva

### 3️⃣ Obtener Client ID y Secret

En tu aplicación, verás dos valores:

```
Client ID:     ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh...
Secret:        DEFGHIJKLMNOPQRSTUVWXYZabcdefghijk...
```

**Copia ambos valores** (los necesitarás en los pasos siguientes)

---

## 📝 Configurar Variables de Entorno

### Backend (apps/api/.env)

Abre `apps/api/.env` y encuentra la sección `PAYPAL`:

```bash
# PAYPAL (sandbox credentials for testing)
PAYPAL_CLIENT_ID=tu_client_id_aqui
PAYPAL_CLIENT_SECRET=tu_secret_aqui
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=""
```

**Reemplaza:**
- `tu_client_id_aqui` → El Client ID que copiaste
- `tu_secret_aqui` → El Secret que copiaste

**Ejemplo:**
```bash
PAYPAL_CLIENT_ID=AZDxjlKAFsdhfj7FJsdkfj-KD7KJSDLKjsdklj4lk5j8j6Jk5lk5j6K
PAYPAL_CLIENT_SECRET=EHkdsflh5lksdhflkjsdhflkj5klj5lkjsdlkj5k6k5j7k8j9k0k
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=""
```

### Frontend (apps/web/.env.local)

Abre `apps/web/.env.local` y actualiza:

```bash
# PAYPAL (same sandbox client ID as backend)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_client_id_aqui
```

**Reemplaza:**
- `tu_client_id_aqui` → El **mismo** Client ID del paso anterior

**Ejemplo:**
```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AZDxjlKAFsdhfj7FJsdkfj-KD7KJSDLKjsdklj4lk5j8j6Jk5lk5j6K
```

---

## 🔄 Reiniciar el Servidor

Después de actualizar las variables de entorno, **reinicia los servidores**:

```bash
# Termina los servidores actuales (Ctrl+C)
# Luego ejecuta:
npm run dev
```

El dev server debería reiniciar y leer las nuevas variables.

---

## ✅ Verificar que PayPal Aparece

1. Abre https://localhost:3000 en tu navegador
2. Agrega productos al carrito
3. Ve a **Checkout** → **Paso 3: Pago**
4. Verifica que aparezca la opción **"PayPal"** junto a "Tarjeta de crédito"

### Si aún no aparece:

**Opción 1: Limpiar caché del navegador**
- Abre DevTools (F12)
- Haz clic derecho en el botón "Refrescar"
- Selecciona "Vaciar caché y recargar completamente"

**Opción 2: Verificar las variables de entorno**
- En DevTools → **Console** tab
- Ejecuta: `console.log(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)`
- Debe mostrar tu Client ID (no vacío)

**Opción 3: Verificar que el archivo se guardó correctamente**
- Abre `apps/web/.env.local`
- Verifica que `NEXT_PUBLIC_PAYPAL_CLIENT_ID=` tenga un valor
- No debe estar vacío

---

## 🧪 Probar PayPal Sandbox

Una vez que veas la opción PayPal:

1. Selecciona **PayPal** en el paso de pago
2. Haz clic en **Continuar**
3. Deberías ver los botones de PayPal

### Para pagar en PayPal:

1. Necesitas una **cuenta personal de PayPal en sandbox**:
   - Ve a https://sandbox.paypal.com
   - Haz clic en **Sandbox** → **Accounts**
   - Busca una cuenta de tipo **"Personal"**
   - Usa esa cuenta para pagar en la prueba

2. Si no tienes una cuenta personal:
   - Haz clic en **Create Account**
   - Selecciona **Personal**
   - Completa el formulario
   - Confirma por email

---

## 🔗 Webhook (Opcional)

Si quieres configurar webhooks para recibir notificaciones de PayPal:

1. En PayPal Dashboard → **Apps & Credentials**
2. En la sección izquierda, ve a **Webhooks**
3. Haz clic en **Create Webhook**
4. Endpoint URL: `http://localhost:3001/pagos/paypal/webhook`
5. Selecciona eventos:
   - ✅ PAYMENT.CAPTURE.COMPLETED
   - ✅ PAYMENT.CAPTURE.DENIED
   - ✅ PAYMENT.CAPTURE.REFUNDED
6. Haz clic en **Create Webhook**
7. Copia el **Webhook ID**
8. Pégalo en `apps/api/.env`:
   ```
   PAYPAL_WEBHOOK_ID=WH-xxxxxxxxxxxxx
   ```

---

## 🚀 Para Pasar a Producción

Cuando estés listo para producción:

1. Obtén credenciales **Live** en PayPal
2. Actualiza `.env`:
   ```
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=tu_live_client_id
   PAYPAL_CLIENT_SECRET=tu_live_secret
   ```
3. Actualiza `apps/web/.env.local`:
   ```
   NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_live_client_id
   ```

---

## 📞 Soporte

Si tienes problemas:

1. Verifica que los valores están copiados correctamente (sin espacios extra)
2. Asegúrate de que reiniciaste el servidor después de cambiar `.env`
3. Revisa la consola del navegador (F12 → Console) para errores
4. Revisa los logs del servidor para mensajes de error

¡PayPal debería estar funcionando después de seguir estos pasos! 🎉

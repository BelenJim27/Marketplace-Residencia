import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

const STATIC_CONTEXT = `Eres el asistente virtual de Mezcales, marketplace de mezcal artesanal de Oaxaca, México.

## Tu rol
Ayudar a clientes, visitantes y productores con preguntas sobre la plataforma. Responde de forma amable, breve y directa (máximo 3-4 oraciones salvo que pidan más detalle). Si el usuario escribe en inglés, responde en inglés. Nunca inventes precios, stock exacto ni estado de pedidos concretos — indica que consulten el catálogo o su cuenta.

## Catálogo y productos
- Todos los mezcales son artesanales y ancestrales, producidos por pequeños productores de Oaxaca.
- Cada producto muestra: tipo de agave, región de origen, grado de alcohol (%) y nombre del productor.
- Los precios ya incluyen IVA — no se agrega ningún cargo extra al pagar.
- Se puede buscar y filtrar por categoría, tipo de agave y rango de precio.
- Solo mayores de 18 años pueden comprar. Se solicita confirmación de edad al entrar al sitio.

## Trazabilidad de lotes
- Cada mezcal está vinculado a un lote de producción específico que incluye: código de lote, fecha de producción, volumen total, grado de alcohol, nombre científico del agave y región.
- El lote garantiza la calidad, autenticidad y trazabilidad artesanal del producto.

## Cómo comprar (flujo completo)
1. Explorar catálogo y agregar productos al carrito.
2. Revisar carrito en /tienda/carrito.
3. Ir a checkout: seleccionar dirección de entrega y método de envío (con cotización de costo).
4. Pagar con tarjeta (Stripe) o PayPal.
5. Recibir confirmación por email con número de pedido y tracking.
- El carrito se conserva aunque no estés logueado y se sincroniza al iniciar sesión.

## Métodos de pago
- Tarjeta de crédito/débito: Visa, Mastercard, American Express (procesado por Stripe).
- PayPal.
- El IVA ya está incluido en el precio — no hay cargos sorpresa.
- Moneda: MXN para compras en México; USD para compras desde EE.UU. o cuando el idioma de la sesión es inglés.
- La tasa de cambio se congela al momento de crear el pedido para evitar variaciones.

## Envíos
- Enviamos a México y Estados Unidos.
- Carriers disponibles: SkydropX se encrgara de los envíos nacionales e internacionales, integrando opciones de DHL, FedEx y Estafeta.
- El costo de envío se calcula en el checkout según la dirección, peso y dimensiones del pedido.
- Los envíos internacionales pueden incluir impuestos de aduana a cargo del comprador.
- Restricción EE.UU.: El sistema verificara el lugar de envío y bloqueará pedidos que no cumplan con las regulaciones de importación de alcohol en EE.UU.

## Seguimiento de pedidos y estados
- Ver estado: iniciar sesión → "Mis pedidos" o "Mis compras".
- Cada pedido tiene número de rastreo para seguimiento en tiempo real.
- Estados del pedido: pendiente → procesando → enviado → entregado.
- También es posible ver el historial completo de eventos de envío en el detalle del pedido.

## Devoluciones y soporte
- Para reclamaciones o devoluciones: contactar soporte desde la sección "Contacto" dentro de esta ventana.
- Cada caso se evalúa individualmente. Los reembolsos son gestionados por el equipo de Mezcales.

## Cuentas de usuario y roles
- **Cliente**: se registra con email/contraseña o con Google. Puede comprar, ver historial de pedidos, gestionar direcciones de entrega, agregar a favoritos y dejar reseñas de productos comprados.
- **Productor artesanal**: solicita unirse a la plataforma → el equipo de Mezcales revisa y aprueba → puede publicar productos, gestionar lotes, ver ventas e ingresos, y recibir pagos (Stripe Connect o PayPal).
  - Proceso para unirse: Registrarse → ir al perfil → "Solicitar ser productor" → llenar formulario con RFC, razón social y datos bancarios.
- **Administrador**: equipo interno de Mezcales, gestiona toda la plataforma.

## Reseñas de productos
- Solo clientes con compra verificada pueden dejar reseña (calificación 1-5 estrellas + comentario).
- Los productores pueden responder públicamente las reseñas de sus productos.

## Pagos a productores
- Los pagos al productor los distribuye el equipo de Mezcales (no son directos del comprador al productor).
- El productor puede ver su resumen de ingresos y el estado de sus pagos desde el panel de productor.

## Lo que no puedo decirte
El estado de tu pedido específico o datos privados de tu cuenta requieren iniciar sesión. Para eso, ingresa a "Mis pedidos" o contacta soporte. Sí puedo orientarte sobre productos, precios, envíos y cualquier duda general.`;

async function fetchCategorias(): Promise<string> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/categorias`, { cache: "no-store" });
    if (!res.ok) return "";
    const data: { nombre: string }[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return "";
    const names = data.map((c) => `- ${c.nombre}`).join("\n");
    return `\n\n## Categorías disponibles en el catálogo\n${names}`;
  } catch {
    return "";
  }
}

interface ProductoAPI {
  id_producto: number | string;
  nombre: string;
  descripcion?: string;
  precio_base: string | number;
  moneda_base?: string;
  calificacion_promedio?: number | null;
  inventario?: { stock: number }[] | { stock: number } | null;
  lote?: {
    grado_alcohol?: number | null;
    nombre_cientifico?: string | null;
    volumen_total?: number | null;
  } | null;
}

async function fetchProductos(): Promise<string> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/productos?limit=50&status=activo`, {
      cache: "no-store",
    });
    if (!res.ok) return "";
    const raw: unknown = await res.json();
    const lista: ProductoAPI[] = Array.isArray(raw)
      ? (raw as ProductoAPI[])
      : Array.isArray((raw as { data?: unknown }).data)
        ? ((raw as { data: ProductoAPI[] }).data)
        : [];
    if (lista.length === 0) return "";

    const lineas = lista.map((p) => {
      const precio = `$${Number(p.precio_base).toFixed(2)} ${p.moneda_base ?? "MXN"}`;
      const alcohol = p.lote?.grado_alcohol ? ` | ${p.lote.grado_alcohol}% Alc.` : "";
      const agave = p.lote?.nombre_cientifico ? ` | Agave: ${p.lote.nombre_cientifico}` : "";
      const invArr = Array.isArray(p.inventario) ? p.inventario : p.inventario ? [p.inventario] : [];
      const stock = invArr.length > 0 ? invArr[0].stock : null;
      const stockStr = stock !== null ? ` | Stock: ${stock} uds` : "";
      const rating =
        p.calificacion_promedio != null
          ? ` | ⭐ ${Number(p.calificacion_promedio).toFixed(1)}/5`
          : "";
      return `- ${p.nombre} | Precio: ${precio}${alcohol}${agave}${stockStr}${rating}`;
    });

    return `\n\n## Productos disponibles en el catálogo (${lista.length} en total)\n${lineas.join("\n")}`;
  } catch {
    return "";
  }
}

function buildRoleContext(rol?: string): string {
  if (rol === "productor") {
    return `

## Contexto: estás hablando con un PRODUCTOR registrado en Mezcales

Oriéntalo sobre el uso de su panel de control. Sé preciso con las rutas de navegación.

### Gestión de productos
- Crear producto: Panel → "Mis Productos" → "Crear producto" → nombre, descripción, precio (con IVA incluido), categoría, imágenes → vincular a un lote existente.
- Un producto requiere un lote previo. Si no tienes lotes, créalos primero en "Mis Lotes".
- Editar producto: "Mis Productos" → clic en el producto → "Editar".
- Subir imágenes: máximo 5 MB por imagen (JPG o PNG).
- Si el stock llega a 0 el producto deja de mostrarse en el catálogo público automáticamente.

### Gestión de lotes
- Crear lote: "Mis Lotes" → "Nuevo lote" → código de lote, fecha de producción, nombre científico del agave, grado de alcohol (%), volumen total producido (litros).
- El lote representa un batch de producción específico y garantiza la trazabilidad del mezcal.
- Un producto puede vincularse a un solo lote.

### Inventario y stock
- Ver y ajustar stock: "Mis Productos" → detalle del producto → sección "Inventario".
- El sistema descuenta stock automáticamente al confirmarse cada venta.

### Pedidos y ventas
- Ver órdenes recibidas: "Mis Pedidos" → lista con estado, monto y datos del comprador.
- Actualizar estado de envío: detalle del pedido → cambiar estado (preparando, enviado, entregado).
- Resumen de ventas e ingresos: sección "Mis Ventas" o "Ingresos" del panel.

### Cobros y pagos
- Conectar cuenta de pago: "Mi Perfil" → "Datos bancarios" → conectar Stripe Connect o PayPal.
- Sin cuenta conectada los pagos quedan retenidos en la plataforma hasta que se configure.
- Los pagos los distribuye el equipo de Mezcales al cierre de cada periodo.

### Solicitud de productor (si aún no aprobado)
- Ver estado de la solicitud: "Mi Perfil" → "Mi solicitud".
- El equipo de Mezcales revisa RFC, razón social y documentos antes de aprobar.`;
  }

  if (rol === "admin") {
    return `

## Contexto: estás hablando con un ADMINISTRADOR de Mezcales

Oriéntalo sobre la gestión de la plataforma. Usa rutas exactas del panel de administración.

### Gestión de usuarios
- Ver todos los usuarios: Panel Admin → "Usuarios" → lista con rol y estado de cada cuenta.
- Crear usuario: "Usuarios" → "Crear usuario" → email, nombre, contraseña y asignar rol.
- Editar usuario: entrar al detalle del usuario → editar campos → guardar cambios.
- Asignar o quitar roles: detalle del usuario → sección "Roles" → agregar o eliminar.

### Aprobar productores
- Solicitudes pendientes: "Solicitudes de Productores" → lista con RFC y datos de la empresa.
- Aprobar solicitud: entrar al detalle → "Aprobar" → el usuario obtiene el rol PRODUCTOR automáticamente.
- Rechazar solicitud: entrar al detalle → "Rechazar" → ingresar motivo del rechazo.

### Gestión de categorías
- Crear categoría: "Categorías" → "Nueva categoría" → nombre, slug, descripción y categoría padre (opcional para jerarquía).
- Las categorías forman un árbol padre-hijo; una categoría puede contener subcategorías.
- Editar o desactivar: entrar al detalle de la categoría.

### Comisiones
- Ver comisiones activas: "Comisiones" → lista con alcance, porcentaje y vigencia.
- Crear comisión: "Nueva comisión" → alcance (global / país / categoría / productor), porcentaje, fechas de vigencia.
- La comisión más específica y de mayor prioridad es la que se aplica a cada pedido.

### Payouts a productores
- Ver payouts pendientes: "Payouts" → lista con monto neto por productor y estado.
- Aprobar payout: entrar al detalle → "Aprobar" → el sistema procesa la transferencia (Stripe Connect o PayPal).

### Configuración del sistema
- "Configuración" → parámetros globales: colores de la tienda, fuentes tipográficas, textos.
- Los cambios se reflejan en tiempo real en la tienda pública.

### Auditoría
- "Auditoría" → filtrar por tabla afectada y rango de fechas.
- Muestra quién realizó cada cambio, el valor anterior y el nuevo valor.

### Roles y permisos
- "Roles y Permisos" → crear roles personalizados y asignarles permisos granulares.
- Los permisos controlan acceso a módulos específicos (usuarios, productos, pedidos, etc.).`;
  }

  return "";
}

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("[chat] GOOGLE_GENERATIVE_AI_API_KEY no está definida");
    return new Response(JSON.stringify({ error: "API key no configurada" }), {
      status: 500,
    });
  }

  const { messages, rol }: { messages: UIMessage[]; rol?: string } = await req.json();
  const [categoriasContext, productosContext] = await Promise.all([
    fetchCategorias(),
    rol === "admin" ? Promise.resolve("") : fetchProductos(),
  ]);
  const roleContext = buildRoleContext(rol);
  const systemPrompt = STATIC_CONTEXT + roleContext + categoriasContext + productosContext;

  try {
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat] Error al llamar Gemini:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}

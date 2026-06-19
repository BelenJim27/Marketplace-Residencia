import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

const STATIC_CONTEXT = `Eres el asistente virtual de Mezcales, un marketplace de mezcal artesanal de Oaxaca, México.

## Tu rol
Ayudar a clientes y visitantes con preguntas sobre la tienda. Si no sabes algo específico, pide que inicien sesión o contacten soporte. No inventes precios ni datos de inventario; di que deben ver el catálogo actualizado en el sitio. Responde de forma amable, breve y concisa (máximo 3-4 oraciones salvo que pidan más detalle). Si el usuario escribe en inglés, responde en inglés.

## Métodos de pago
- Tarjeta de crédito/débito (Stripe — Visa, Mastercard, American Express)
- PayPal
- El IVA ya está incluido en el precio de cada producto.

## Envíos
- Enviamos a México y Estados Unidos.
- Carriers: FedEx y SkydropX (nacional).
- El costo de envío se calcula al momento del checkout según la dirección y el peso del pedido.
- Los envíos internacionales pueden incluir impuestos de aduana del país destino.

## Regulaciones
- Sólo vendemos a mayores de 18 años. Se solicita confirmación de edad al acceder al sitio.
- Para envíos a EE.UU.: el cliente es responsable de verificar las leyes de importación de alcohol de su estado.

## Pedidos
- Para ver el estado de un pedido: iniciar sesión → "Mis pedidos".
- En cada pedido se puede ver el número de tracking para rastrear el envío.
- Devoluciones y reclamaciones: contactar a soporte desde la cuenta o al correo de la tienda.

## Productores / Unirse a la plataforma
- Cualquier productor artesanal de mezcal puede solicitar unirse.
- Proceso: registrarse → ir al perfil → "Solicitar ser productor" → llenar el formulario con RFC y datos de la empresa → el equipo de Mezcales revisa y aprueba.
- Una vez aprobado, se puede publicar productos, gestionar lotes y recibir pagos.

## Sobre los productos
- Todos los mezcales son artesanales, producidos por pequeños productores de Oaxaca.
- Cada producto muestra: tipo de agave, región de origen, grado de alcohol, notas de cata y nombre del productor.
- Los precios ya incluyen IVA.`;

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

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("[chat] GOOGLE_GENERATIVE_AI_API_KEY no está definida");
    return new Response(JSON.stringify({ error: "API key no configurada" }), {
      status: 500,
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const categoriasContext = await fetchCategorias();
  const systemPrompt = STATIC_CONTEXT + categoriasContext;

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

# Auditoría Profunda — FedEx, Taxes, Aduanas y Precios en Dólares

**Fecha:** 2026-05-30  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Rama:** main  
**Alcance:** `apps/api/src/modules/envios/`, `apps/api/src/modules/pagos/`, `apps/api/src/modules/pedidos/`, `apps/api/src/modules/email/`, `apps/web/src/app/tienda/`, `apps/web/src/hooks/`, `apps/web/src/lib/`, `packages/database/prisma/schema.prisma`

---

## Resumen Ejecutivo

| Área | Estado | Problemas Críticos | Problemas Menores |
|------|--------|--------------------|-------------------|
| Conversión de tarifas FedEx | 🟡 | 1 | 2 |
| Datos hardcodeados | 🟡 | 2 | 4 |
| Lógica de taxes | 🟡 | 2 | 2 |
| Guías y aduana | 🔴 | 3 | 2 |
| Traducción de productos | 🔴 | 3 | 2 |
| Precios en USD | 🔴 | 3 | 2 |

**Total: 14 problemas críticos, 14 problemas menores.**

---

## Área 1 — Conversión de Tarifas FedEx

### PROBLEMA A1.1 (Crítico)
```
ARCHIVO: apps/api/src/modules/envios/envios.controller.ts (línea 64–74)
CÓDIGO:
  if (dto.destino.pais === 'MX') {
    for (const q of quotes) {
      if (q.moneda !== 'MXN') {
        try {
          const conv = await this.tasasCambio.convertir(q.moneda, 'MXN', String(q.precioTotal));
          q.precioTotal = conv.monto_destino;
          q.moneda = 'MXN';
        } catch { /* sin tasa vigente: mantener moneda original */ }
      }
    }
  }
PROBLEMA: La conversión de moneda solo ocurre cuando el destino es México.
  Para envíos internacionales (USA, Europa), las tarifas se devuelven en USD sin ninguna
  conversión, aunque el usuario haya seleccionado EUR o MXN como moneda de display.
  Tampoco hay campo en la respuesta que indique si la tasa se aplicó o no.
IMPACTO: Usuarios con destino internacional ven la tarifa de envío en USD
  aunque el resto del carrito esté en MXN. El total en checkout mezcla monedas.
CORRECCIÓN:
  Reemplazar la condición `pais === 'MX'` por lógica que convierta a la moneda
  solicitada (dto.moneda_destino ?? 'MXN') sin importar el país:
  
  const targetCurrency = dto.moneda_destino ?? 'MXN';
  for (const q of quotes) {
    if (q.moneda !== targetCurrency) {
      try {
        const conv = await this.tasasCambio.convertir(q.moneda, targetCurrency, String(q.precioTotal));
        q.precioTotal = conv.monto_destino;
        q.moneda = targetCurrency;
      } catch (e) {
        this.logger.warn(`Sin tasa ${q.moneda}→${targetCurrency}: cotización devuelta en ${q.moneda}`);
        // NO silenciar: añadir campo indicador
        (q as any).conversion_error = true;
      }
    }
  }
```

### PROBLEMA A1.2 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/envios.controller.ts (línea 71)
CÓDIGO: catch { /* sin tasa vigente: mantener moneda original */ }
PROBLEMA: Falla silenciosa. Si la DB no tiene tasa vigente, la cotización queda
  en la moneda equivocada sin ningún log ni señal al frontend.
IMPACTO: Difícil de depurar en producción. El usuario ve la moneda incorrecta
  sin ninguna advertencia.
CORRECCIÓN:
  catch (err: any) {
    this.logger.warn(`Sin tasa de cambio ${q.moneda}→MXN: ${err?.message}`);
    (q as any).conversion_error = true;
  }
```

### PROBLEMA A1.3 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (línea 297)
CÓDIGO: const currency: string = preferred.currency || (destinationCountry === 'MX' ? 'MXN' : 'USD');
PROBLEMA: Si FedEx no devuelve el campo `currency` (ocurre en sandbox), se asume
  MXN para México y USD para internacional. Este guess puede estar equivocado y
  causar conversiones dobles o incorrectas en el controller.
IMPACTO: Bajo en producción (FedEx siempre devuelve currency), pero puede causar
  errores confusos en sandbox.
CORRECCIÓN:
  if (!preferred.currency) {
    this.logger.warn(`FedEx no devolvió currency para ${serviceType}; asumiendo default`);
  }
  const currency: string = preferred.currency || (destinationCountry === 'MX' ? 'MXN' : 'USD');
```

---

## Área 2 — Datos Hardcodeados en FedEx

### PROBLEMA A2.1 (Crítico)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (líneas 164–165)
CÓDIGO:
  unitPrice: { amount: dto.valor_declarado_usd ?? 10.00, currency: 'USD' },
  customsValue: { amount: dto.valor_declarado_usd ?? 10.00, currency: 'USD' },
PROBLEMA: Cuando no se especifica el valor declarado, se usan $10.00 USD como valor
  aduanal para TODOS los envíos internacionales. Un mezcal artesanal típicamente
  cuesta $40–$150 USD. Declarar $10 es undervaluation intencional de mercancía,
  lo que puede:
  - Causar retención por aduanas de USA
  - Generar penalidades por sub-declaración
  - No cubrir el seguro en caso de pérdida
IMPACTO: Crítico para envíos internacionales. Riesgo legal y operativo.
CORRECCIÓN:
  1. Hacer el campo obligatorio en CotizarEnvioDto para envíos internacionales:
     @ValidateIf(o => o.destino?.pais !== 'MX')
     @IsNumber()
     @Min(1)
     valor_declarado_usd: number;
  
  2. O derivar del subtotal del pedido si se pasa id_pedido en el DTO.
```

### PROBLEMA A2.2 (Crítico)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (línea 453)
CÓDIGO: const declaredValue = Number(envio.valor_declarado_aduana || 10);
PROBLEMA: Mismo problema que A2.1, pero en el momento de CREAR la guía real.
  Si el campo `valor_declarado_aduana` en la tabla `envios` está vacío, se emite
  la guía con $10 de valor declarado.
IMPACTO: Crítico. La guía física que va con el paquete declara $10 a la aduana.
CORRECCIÓN:
  Al crear el envío en DB (envios.service.ts), poblar `valor_declarado_aduana`
  desde `pedidos.total` convertido a USD. Lanzar error si sigue siendo null
  antes de crear la guía:
  
  if (!envio.valor_declarado_aduana || Number(envio.valor_declarado_aduana) < 1) {
    throw new HttpException(
      'valor_declarado_aduana requerido para envíos internacionales',
      HttpStatus.BAD_REQUEST,
    );
  }
```

### PROBLEMA A2.3 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (líneas 241–250)
CÓDIGO:
  return [
    { productCode: 'FEDEX_INTERNATIONAL_PRIORITY', ..., precioTotal: 85, moneda: 'USD', ... },
    { productCode: 'FEDEX_INTERNATIONAL_ECONOMY', ..., precioTotal: 55, moneda: 'USD', ... },
  ];
  ...
  return [
    { productCode: 'PRIORITY_OVERNIGHT', ..., precioTotal: 450, moneda: 'MXN', ... },
    { productCode: 'STANDARD_OVERNIGHT', ..., precioTotal: 320, moneda: 'MXN', ... },
  ];
CONDICIÓN: Solo activa cuando FEDEX_ENV=sandbox y FedEx devuelve 0 cotizaciones.
PROBLEMA: Valores de prueba hardcodeados. Si por error se usa FEDEX_ENV=sandbox en
  producción, el cliente ve tarifas falsas y confirma un pedido con costo incorrecto.
IMPACTO: Bajo (sandbox solo), pero podría confundir si FEDEX_ENV no se configura.
CORRECCIÓN:
  Mover a variables de entorno con valores explícitos:
  FEDEX_MOCK_INTL_PRIORITY_USD=85
  FEDEX_MOCK_INTL_ECONOMY_USD=55
  FEDEX_MOCK_MX_PRIORITY_MXN=450
  FEDEX_MOCK_MX_STANDARD_MXN=320
  
  Y advertir en log que se están usando tarifas mock:
  this.logger.error('⚠️  USANDO TARIFAS MOCK DE DESARROLLO — No usar en producción');
```

### PROBLEMA A2.4 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (líneas 51–58)
CÓDIGO:
  this.shipperPostalCode = this.config.get('FEDEX_SHIPPER_POSTAL_CODE', '68000');
  this.shipperCity = this.config.get('FEDEX_SHIPPER_CITY', 'Oaxaca de Juárez');
  this.shipperName = this.config.get('FEDEX_SHIPPER_NAME', 'Productor Mezcal');
  this.shipperPhone = this.config.get('FEDEX_SHIPPER_PHONE', '9511234567');
  this.shipperStateCode = this.config.get('FEDEX_SHIPPER_STATE_CODE', 'OA');
PROBLEMA: Si las variables de entorno no están configuradas, se usan valores de Oaxaca
  con nombre "Productor Mezcal" y teléfono de prueba. En producción, las guías
  físicas mostrarán datos incorrectos del remitente.
IMPACTO: Medio. Los paquetes pueden no ser recogidos por FedEx si el remitente
  no coincide con la cuenta.
CORRECCIÓN:
  Validar en startup que las variables críticas estén definidas:
  
  constructor(private http: HttpService, private config: ConfigService) {
    const env = this.config.get('FEDEX_ENV', 'sandbox');
    if (env !== 'sandbox') {
      const required = ['FEDEX_SHIPPER_POSTAL_CODE','FEDEX_SHIPPER_CITY',
                        'FEDEX_SHIPPER_NAME','FEDEX_SHIPPER_PHONE'];
      for (const key of required) {
        if (!this.config.get(key)) {
          throw new Error(`Variable de entorno requerida no definida: ${key}`);
        }
      }
    }
    // ... resto del constructor
  }
```

### PROBLEMA A2.5 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (línea 182)
CÓDIGO: 'X-locale': 'es_MX',
PROBLEMA: El locale de la petición a FedEx está hardcodeado en español mexicano.
  Para envíos internacionales, FedEx puede devolver mensajes de error en español
  cuando el destinatario es de otro país. No es bloqueante, pero puede afectar
  la claridad de mensajes de error.
IMPACTO: Bajo. Solo afecta mensajes de error internos.
CORRECCIÓN:
  Parametrizar según el destino:
  'X-locale': dto.destino.pais === 'MX' ? 'es_MX' : 'en_US',
```

### PROBLEMA A2.6 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (líneas 435–441)
CÓDIGO:
  dimensions: {
    length: Math.round(Number(envio.largo_cm) || 20),
    width: Math.round(Number(envio.ancho_cm) || 15),
    height: Math.round(Number(envio.alto_cm) || 15),
    units: 'CM',
  },
PROBLEMA: Dimensiones con fallback a 20×15×15 cm si no se especifican. Para una
  botella de mezcal (750ml) las dimensiones correctas son ~30×10×10 cm. Dimensiones
  incorrectas afectan el peso dimensional (DIM weight) y el costo real.
IMPACTO: Menor. El costo real puede diferir del cotizado.
CORRECCIÓN:
  Requerir dimensiones en el DTO de creación de envío, o usar valores predeterminados
  configurables por SKU/producto.
```

---

## Área 3 — Lógica de Taxes (Impuestos)

### PROBLEMA A3.1 (Crítico)
```
ARCHIVO: apps/api/src/modules/pagos/stripe.service.ts (líneas 88–168)
ARCHIVO: apps/api/src/modules/pedidos/pedidos.service.ts (líneas 218–237)
PROBLEMA: Stripe Tax calcula correctamente el impuesto por jurisdicción (exclusive tax
  sobre subtotal + shipping). Sin embargo, `pedidos.tax_amount` se queda en 0 al crear
  el pedido. El campo solo se actualiza DESPUÉS del pago confirmado (en pagos.service.ts
  líneas 122–126). Resultado: pedidos abandonados quedan con tax_amount = 0 en DB.
FLUJO ACTUAL:
  1. Frontend crea pedido → pedidos.tax_amount = 0 (default)
  2. Frontend crea payment intent → Stripe calcula tax (taxCents) → no se guarda a DB
  3. Stripe webhook confirma pago → pagos.service.ts actualiza tax_amount
  Problema: Si el pedido se abandona en paso 2, tax_amount nunca se guarda.
IMPACTO: Reportes financieros incorrectos. La prorrateación de tax por productor
  (pedidos.service.ts líneas 501–502) da 0 para pedidos no completados.
CORRECCIÓN:
  En pagos.service.ts, después de crear el payment intent y obtener taxAmount,
  actualizar el pedido inmediatamente:
  
  const intent = await this.stripeService.createPaymentIntent({...});
  
  // Guardar tax calculado aunque el pago aún no confirme
  await this.prisma.pedidos.update({
    where: { id_pedido: id_pedido_bi },
    data: { tax_amount: intent.taxAmount.toFixed(2) },
  });
```

### PROBLEMA A3.2 (Crítico)
```
ARCHIVO: apps/api/src/modules/pagos/pagos.service.ts (línea 184 aprox.)
CÓDIGO: tax_amount: '0'  // en el flujo de PayPal
PROBLEMA: Órdenes pagadas con PayPal tienen tax_amount = 0 permanentemente.
  PayPal no integra con Stripe Tax, pero el código no calcula ni estima el impuesto
  por ningún otro medio para pagos con PayPal.
IMPACTO: Dos usuarios que compran el mismo producto pagan impuesto diferente según
  método de pago. Inconsistencia contable.
CORRECCIÓN:
  Para PayPal, usar el mismo `stripe.tax.calculations.create()` para calcular
  el tax ANTES de crear la orden de PayPal, luego guardarlo en `pedidos.tax_amount`.
  El cálculo de Stripe Tax no requiere payment intent, solo necesita la dirección
  y los montos:
  
  // Antes de crear PayPal order:
  const taxCalc = await this.stripe.tax.calculations.create({
    currency: 'mxn',
    line_items: [...],
    customer_details: { address: stripeAddress, taxIds: [] },
  });
  const taxAmount = taxCalc.tax_amount_exclusive ?? 0;
```

### PROBLEMA A3.3 (Menor)
```
ARCHIVO: apps/api/src/modules/pagos/stripe.service.ts (línea 119 aprox.)
CÓDIGO: console.warn('[stripe] tax.calculations.create failed, continuing without tax:', error?.message);
PROBLEMA: Si Stripe Tax falla, el pedido procede con $0 de impuesto sin ningún
  registro de auditoría. No hay alerta al admin.
IMPACTO: Pérdida de ingresos fiscales no detectada.
CORRECCIÓN:
  Registrar en tabla auditoria o enviar notificación admin cuando tax calculation falle:
  
  await this.prisma.auditoria.create({
    data: {
      accion: 'TAX_CALCULATION_FAILED',
      tabla: 'pedidos',
      detalle: JSON.stringify({ id_pedido, error: error?.message }),
    },
  });
```

### PROBLEMA A3.4 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (línea 296)
CÓDIGO: const totalCharge = preferred.totalNetChargeWithDutiesAndTaxes ?? preferred.totalNetCharge;
PROBLEMA: La tarifa FedEx que incluye duties & taxes internacionales se usa como
  total, pero nunca se desglosa al usuario. Si `totalNetChargeWithDutiesAndTaxes`
  difiere de `totalNetCharge`, la diferencia son impuestos/aranceles estimados
  que el comprador no ve explicados.
IMPACTO: El cliente no sabe cuánto son aranceles vs costo de envío puro.
  Para mezcal a USA, los aranceles pueden ser significativos.
CORRECCIÓN:
  Añadir campos al ShippingQuote:
  precioEnvioBase: Number(preferred.totalNetCharge) || 0,
  dutiesAndTaxes: Number(preferred.totalNetChargeWithDutiesAndTaxes ?? 0) - Number(preferred.totalNetCharge ?? 0),
  
  Y mostrarlos separados en el frontend.
```

---

## Área 4 — Generación de Guías y Documentos Aduanales

### PROBLEMA A4.1 (Crítico)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (línea 160)
CÓDIGO: description: dto.descripcion_contenido ?? 'Mezcal artesanal',
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (línea 462)
CÓDIGO: description: envio.contenido_descripcion ?? 'Mezcal artesanal',
PROBLEMA: Las descripciones aduanales se envían en ESPAÑOL. US Customs (CBP) y la
  normativa FedEx internacional REQUIEREN que las descripciones de contenido sean
  en INGLÉS para envíos que entren a territorio americano. "Mezcal artesanal" puede
  causar:
  - Retención del paquete por descripción no estandarizada
  - Reclasificación incorrecta por el oficial de aduana
  - Rechazo y devolución del paquete
IMPACTO: Crítico para todo envío MX→USA. Bloquea operaciones internacionales.
CORRECCIÓN:
  1. Para envíos internacionales, usar siempre descripción en inglés:
  
  const isIntl = dto.destino?.pais !== 'MX';
  const description = isIntl
    ? (dto.descripcion_contenido_en ?? 'Artisanal Mezcal - Distilled Agave Spirit')
    : (dto.descripcion_contenido ?? 'Mezcal artesanal');
  
  2. Añadir campo `descripcion_contenido_en` al DTO.
  3. En createShipment, usar `envio.contenido_descripcion_en ?? 'Artisanal Mezcal'`.
```

### PROBLEMA A4.2 (Crítico)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (línea 469)
CÓDIGO: ...(envio.codigo_hs && { harmonizedCode: envio.codigo_hs }),
PROBLEMA: El código HS (armonizado) es OPCIONAL y sin valor default. Si no se
  especifica, FedEx lo omite de la declaración de aduana. US Customs puede:
  - Asignar un HS code incorrecto (más caro en aranceles)
  - Detener el paquete por declaración incompleta
  
  Para mezcal el código HS es: 2208.90.6000 (Other: Tequila, mezcal, other
  agave spirits) según el HTS de USA.
IMPACTO: Aranceles incorrectos o retención por aduana.
CORRECCIÓN:
  harmonizedCode: envio.codigo_hs ?? '220890',  // Mezcal / bebidas destiladas
  
  Y añadir opción de configurar HS code por categoría de producto en la BD.
```

### PROBLEMA A4.3 (Crítico)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (líneas 452–471)
PROBLEMA: La declaración aduanal tiene varias omisiones graves para envíos comerciales:

  1. SIN FACTURA COMERCIAL (Commercial Invoice): Para envíos comerciales MX→USA
     con valor >$800 USD, CBSA y CBP requieren factura comercial formal (CN22/CN23).
     El código actual solo llena el customsClearanceDetail básico de FedEx,
     no genera ni adjunta una factura comercial.

  2. SIN USMCA/T-MEC: El mezcal mexicano califica para el tratado T-MEC
     (USMCA), lo que puede reducir o eliminar aranceles. El código no
     incluye ningún flag de USMCA ni Certificate of Origin.

  3. UN SOLO LINE ITEM: Si el pedido tiene 3 botellas diferentes, se declara
     todo como 1 commodity. Aduana puede requerir desglose por SKU.

  4. DUTIES PAYMENT: `paymentType: 'SENDER'` significa que el vendedor paga
     los aranceles. Esto es DDP (Delivery Duty Paid). Debería ser configurable
     por pedido (DDP vs DDU).

IMPACTO: Para envíos >$800 USD, riesgo alto de retención aduanal.
CORRECCIÓN (Fase futura):
  a) Implementar generación de Commercial Invoice como documento adjunto a FedEx.
  b) Añadir campo USMCA: { documentTypes: ['USMCA_CERTIFICATE_OF_ORIGIN'] }
  c) Iterar sobre detalle_pedido para crear un commodity por SKU.
  d) Exponer configuración DDP/DDU por pedido o por cliente.
```

### PROBLEMA A4.4 (Menor)
```
ARCHIVO: apps/api/src/modules/envios/fedex.service.ts (líneas 507–509)
CÓDIGO:
  if (!labelBuffer) {
    this.logger.warn(`FedEx no devolvió PDF para guía ${trackingNumber}. encodedLabel ausente.`);
  }
  return { trackingNumber, labelBuffer, labelFormat: 'PDF' };
PROBLEMA: Cuando FedEx no devuelve el PDF de la etiqueta, el código retorna
  `labelBuffer: undefined` sin lanzar error. El llamador en envios.service.ts
  puede guardar la guía en DB sin PDF, dejando la guía en estado inutilizable.
IMPACTO: Admin/productor no puede imprimir la etiqueta para el paquete.
CORRECCIÓN:
  Si trackingNumber existe pero labelBuffer es undefined, considerar reintentar
  o guardar el estado 'LABEL_PENDING' para solicitar el PDF más tarde.
```

### PROBLEMA A4.5 (Menor)
```
ARCHIVO: packages/database/prisma/schema.prisma (campo envios.valor_declarado_aduana)
PROBLEMA: `valor_declarado_aduana` tiene default NULL y `moneda_aduana` default 'MXN'.
  Pero FedEx requiere el valor en USD para envíos internacionales. Si el registro
  de envío no se actualiza con el valor correcto antes de crear la guía,
  se usa el fallback de $10 USD (A2.2).
IMPACTO: Ver A2.2.
CORRECCIÓN:
  Al crear el envío (EnviosService.create()), copiar el total del pedido convertido
  a USD como `valor_declarado_aduana` y cambiar `moneda_aduana` a 'USD'.
```

---

## Área 5 — Traducción de Detalles de Productos

### PROBLEMA A5.1 (Crítico)
```
ARCHIVO: apps/api/src/modules/productos/productos.service.ts (método findOne)
PROBLEMA: `ProductosService.findOne()` devuelve `producto.nombre` y
  `producto.descripcion` siempre en español. La tabla `productos_traducciones`
  existe en el schema Prisma y tiene los campos correctos (idioma, nombre,
  descripcion, metadata), pero NINGÚN endpoint la consulta ni la usa.
IMPACTO: Usuarios en modo inglés (locale=en) ven todas las descripciones de
  productos en español. Impide ventas a clientes angloparlantes.
CORRECCIÓN:
  Añadir parámetro lang al endpoint y resolver traducciones:
  
  // En ProductosService.findOne():
  async findOne(id: string, lang = 'es') {
    const producto = await this.prisma.productos.findUnique({
      where: { id_producto: BigInt(id) },
      include: {
        productos_traducciones: lang !== 'es'
          ? { where: { idioma: lang } }
          : false,
      },
    });
    if (lang !== 'es' && producto?.productos_traducciones?.[0]) {
      const t = producto.productos_traducciones[0];
      return { ...producto, nombre: t.nombre ?? producto.nombre,
               descripcion: t.descripcion ?? producto.descripcion };
    }
    return producto;
  }
```

### PROBLEMA A5.2 (Crítico)
```
ARCHIVO: apps/web/src/app/cliente/producto/[id]/page.tsx
PROBLEMA: Labels de atributos del producto hardcodeados en español:
  - "Región de Origen"
  - "Tipo de Maguey"
  - "Maestro Productor"
  - "Tipo de Horno"
  - "Notas de Sabor"
  - "Grado Alcohólico"
  Estos textos NO pasan por el sistema de i18n (t() function).
IMPACTO: En modo inglés, el layout del producto muestra etiquetas en español
  aunque el resto de la UI esté en inglés.
CORRECCIÓN:
  Añadir claves al archivo messages/en.json:
  {
    "product": {
      "region": "Region of Origin",
      "agave": "Agave Type",
      "producer": "Master Producer",
      "oven": "Oven Type",
      "flavor_notes": "Flavor Notes",
      "alcohol": "Alcohol Content"
    }
  }
  Y en messages/es.json:
  {
    "product": {
      "region": "Región de Origen",
      ...
    }
  }
  Luego usar t('product.region') en el componente.
```

### PROBLEMA A5.3 (Crítico)
```
ARCHIVO: apps/api/src/modules/email/email.service.ts
PROBLEMA: TODOS los emails están hardcodeados en español:
  - sendWelcomeEmail() → "¡Bienvenido a Marketplace!"
  - sendPasswordResetEmail() → "Recuperar tu contraseña"
  - sendOrderConfirmationEmail() → "Tu orden {N} ha sido confirmada"
  
  Adicionalmente, el Surgeon General Warning en sendOrderConfirmationEmail()
  está en INGLÉS (requerido por 27 CFR 16.21 para ventas a USA) mientras el
  resto del email es español. Inconsistencia visible al cliente.
IMPACTO: Clientes angloparlantes reciben todos los emails en español.
  Inconsistencia idioma en emails con Surgeon General Warning.
CORRECCIÓN:
  Añadir parámetro `lang: 'es' | 'en' = 'es'` a cada método de email.
  Crear objeto de strings por idioma:
  
  const strings = {
    es: { subject: '¡Bienvenido!', greeting: 'Hola', ... },
    en: { subject: 'Welcome!', greeting: 'Hello', ... },
  };
  const s = strings[lang] ?? strings.es;
  
  Y pasar el idioma preferido del usuario al llamar cada método.
```

### PROBLEMA A5.4 (Menor)
```
ARCHIVO: apps/web/src/components/Products/ProductDetailPremium.tsx
CÓDIGO:
  const maguey = producto.lotes?.datos_api?.maguey || 'Espadin';
  const maestro = producto.nombre_productor || 'Productor artesanal';
PROBLEMA: Valores de fallback hardcodeados en español. En modo inglés deberían
  ser 'Espadín' (nombre propio, aceptable) y 'Artisan Producer'.
IMPACTO: Bajo. Solo afecta productos sin datos completos.
CORRECCIÓN:
  const maestro = producto.nombre_productor || t('product.default_producer');
```

### PROBLEMA A5.5 (Menor)
```
ARCHIVO: packages/database/prisma/schema.prisma (tabla usuarios)
PROBLEMA: La tabla `usuarios` no tiene campo `idioma_preferido`. El cambio de
  locale solo se guarda en localStorage (client-side). Si el usuario accede desde
  otro dispositivo o borra cookies, vuelve a español.
IMPACTO: UX inconsistente para usuarios internacionales.
CORRECCIÓN:
  Añadir a schema.prisma:
    idioma_preferido  String  @default("es") @db.Char(2)
  
  Y sincronizar con la selección del LocaleSwitcher via PATCH /usuarios/me.
```

---

## Área 6 — Precios en Dólares (USD)

### PROBLEMA A6.1 (Crítico)
```
ARCHIVO: apps/web/src/hooks/useCheckout.ts (línea 341 aprox.)
CÓDIGO: const totalConEnvio = precioTotal + costoEnvio
PROBLEMA: Esta suma mezcla monedas distintas sin conversión:
  - `precioTotal`: suma de items del carrito → siempre en MXN (moneda_base = 'MXN' en schema)
  - `costoEnvio`: tarifa FedEx → MXN para destinos nacionales, USD para internacionales
  
  Ejemplo concreto de error:
    Items: 1,500 MXN
    Envío FedEx a USA: $85 USD (≈ 1,700 MXN @ 20 MXN/USD)
    Total calculado: 1,500 + 85 = 1,585 (en unidades mixtas, valor incorrecto)
    El total real debería ser ≈ 3,200 MXN o ≈ $160 USD
IMPACTO: Crítico. El total del pedido puede estar muy por debajo del real.
  El cargo a tarjeta/PayPal es incorrecto para envíos internacionales.
CORRECCIÓN:
  Antes de sumar, convertir costoEnvio a la misma moneda que precioTotal (MXN):
  
  const envioMoneda = envioSeleccionado.moneda ?? 'MXN';
  let costoEnvioMXN = envioSeleccionado.precioTotal;
  
  if (envioMoneda !== 'MXN' && tasas[envioMoneda]) {
    // tasas[envioMoneda] es la tasa MXN/USD, entonces USD→MXN = precio / tasa
    costoEnvioMXN = envioSeleccionado.precioTotal / tasas[envioMoneda];
  }
  
  const totalConEnvio = precioTotal + costoEnvioMXN;
```

### PROBLEMA A6.2 (Crítico)
```
ARCHIVO: apps/web/src/hooks/useCheckout.ts (línea 352 aprox.)
CÓDIGO:
  moneda: currency,          // 'MXN' | 'USD' | 'EUR' — selección visual del usuario
  total: totalConEnvio.toString(),  // calculado en MXN
PROBLEMA: El campo `moneda` del pedido captura la DISPLAY CURRENCY elegida por el
  usuario en el selector visual (Step 3 del checkout). Pero `totalConEnvio` está
  calculado en MXN (ver A6.1). Se guarda en DB: { total: "1585", moneda: "USD" }.
  Esto indica que el pedido vale $1,585 USD cuando en realidad es ≈ $79 USD.
IMPACTO: Crítico. Reportes financieros, Stripe charges, y payouts calculados sobre
  datos incorrectos.
CORRECCIÓN:
  Opción A (recomendada): Guardar SIEMPRE en MXN como moneda base:
    moneda: 'MXN',
    total: totalConEnvioMXN.toString(),
    tipo_cambio: currency !== 'MXN' ? tasas[currency] : null,
    moneda_referencia: currency !== 'MXN' ? currency : null,
  
  Opción B: Convertir el total a la moneda seleccionada antes de guardar:
    const totalEnMoneda = currency === 'MXN' ? totalConEnvio : totalConEnvio * tasas[currency];
    moneda: currency,
    total: totalEnMoneda.toFixed(2),
```

### PROBLEMA A6.3 (Crítico)
```
ARCHIVO: apps/web/src/app/tienda/carrito/page.tsx (línea 172 aprox.)
CÓDIGO: `${formatPrice(subtotal, { showCurrency: false })} MXN`
PROBLEMA: El carrito muestra siempre "MXN" hardcodeado, sin importar el locale o
  la moneda preferida del usuario. Un usuario en modo inglés que piensa en USD
  no puede ver el subtotal en su moneda.
IMPACTO: UX incompleta para usuarios internacionales. El carrito y el checkout
  usan monedas distintas.
CORRECCIÓN:
  Usar el contexto de locale/currency para mostrar en la moneda preferida:
  const { displayCurrency, convertToDisplay } = useLocale();
  `${formatPrice(convertToDisplay(subtotal), { showCurrency: false })} ${displayCurrency}`
```

### PROBLEMA A6.4 (Menor)
```
ARCHIVO: apps/web/src/lib/format-number.ts
CÓDIGO: new Intl.NumberFormat("es-MX", { style: "currency", currency, ... })
PROBLEMA: El locale de formateo está hardcodeado en "es-MX" (español de México).
  Aunque se pase currency: "USD", el formato de separadores de miles es el
  mexicano (ej: "$ 1,234.56" en lugar de "$1,234.56" en en-US).
  Para usuarios en inglés, el formato numérico debería ser "en-US".
IMPACTO: Bajo. Estética, no funcional. Pero puede confundir a usuarios
  acostumbrados al formato numérico anglosajón.
CORRECCIÓN:
  export function formatPrice(value: number | string, options?: {
    currency?: string;
    showCurrency?: boolean;
    locale?: string;  // NUEVO parámetro
  }) {
    const locale = options?.locale ?? 'es-MX';
    return new Intl.NumberFormat(locale, { ... }).format(numValue);
  }
  
  Y pasar el locale desde el contexto:
  formatPrice(amount, { locale: currentLocale === 'en' ? 'en-US' : 'es-MX' })
```

### PROBLEMA A6.5 (Menor)
```
ARCHIVO: apps/web/src/app/tienda/checkout/page.tsx (líneas 689–712 aprox.)
PROBLEMA: El selector de moneda (MXN/USD/EUR) aparece en el Step 3 del checkout,
  DESPUÉS de que el usuario ya eligió su opción de envío en Step 2. Esto significa
  que el usuario no puede ver el costo de envío en su moneda preferida cuando
  está comparando opciones.
FLUJO ACTUAL:
  Step 1: Dirección
  Step 2: Envío (precios en MXN o USD según FedEx)  ← sin selector de moneda
  Step 3: Pago (aparece selector de moneda)
IMPACTO: UX subóptima. El usuario angloparlante ve precios en MXN en Step 2.
CORRECCIÓN:
  Mover el selector de moneda a Step 1, o mostrarlo permanentemente en el
  header del checkout (fuera del flujo de pasos).
```

---

## Plan de Acción Priorizado

### 🔴 Crítico — Corregir antes del próximo envío internacional

1. **A6.1** — Conversión de moneda antes de sumar subtotal + envío en `useCheckout.ts`
   - Riesgo: Cobros incorrectos a clientes. Trivial de corregir.
   
2. **A6.2** — Guardar pedido en moneda base (MXN), no en display currency
   - Riesgo: Datos financieros corruptos en DB. Requiere coordinar con reportes.
   
3. **A4.1** — Cambiar descripción aduanal de español a inglés para envíos internacionales
   - Riesgo: Retención de paquetes en aduana USA. Cambio de 2 líneas.
   
4. **A2.1 / A2.2** — Eliminar default $10 USD como valor declarado
   - Riesgo: Subestimación aduanal = problema legal. Requiere cambio en DTO + lógica.
   
5. **A5.3** — Agregar soporte de idioma a emails de confirmación de orden
   - Riesgo: Clientes angloparlantes reciben confirmación en español.

### 🟡 Importante — Corregir esta semana

6. **A3.1** — Persistir tax_amount en DB cuando se crea el payment intent (no solo al confirmar)
7. **A3.2** — Calcular tax también para órdenes PayPal
8. **A4.2** — Añadir HS code default 220890 para mezcal
9. **A5.1** — Conectar `productos_traducciones` en `ProductosService.findOne()`
10. **A5.2** — Mover labels hardcodeados del detalle de producto a archivos i18n
11. **A1.1** — Convertir tarifas FedEx a la moneda del pedido (no solo a MXN)
12. **A6.3** — Carrito: mostrar precio en moneda preferida del usuario

### 🟢 Mejora — Siguiente sprint

13. **A4.3** — Implementar factura comercial y USMCA para envíos MX→USA >$800
14. **A2.4** — Validar env vars de remitente FedEx en startup de producción
15. **A5.5** — Persistir idioma preferido del usuario en DB
16. **A3.4** — Desglosar duties & taxes de FedEx al usuario
17. **A2.3** — Mover tarifas mock de sandbox a variables de entorno
18. **A6.5** — Mover selector de moneda al inicio del checkout
19. **A1.2** — Loguear fallos de conversión de moneda (no silenciar)
20. **A6.4** — Respetar locale en `formatPrice` (en-US vs es-MX)

---

## Notas Técnicas Adicionales

### Estado del sistema de exchange rates
- Sincronización automática cada hora via `ExchangeRate-API` (si `EXCHANGERATE_API_KEY` definida)
- Solo se sincronizan los pares: `MXN→USD` y `MXN→EUR`
- Para conversiones inversas (USD→MXN), se necesita invertir la tasa manualmente
- La tasa de conversión actual en uso para checkout es ≈17 MXN/USD (hardcodeada en algunos lugares del código web)

### Estado del sistema i18n
- Sistema: `next-intl` + contexto local (`LocaleContext`)
- Idiomas configurados: `es` (default), `en`
- Cobertura de traducción UI: ~80% (common, catalog, checkout, legal)
- Cobertura de datos de producto: 0% (sin traducciones en uso)
- Persistencia: localStorage únicamente

### Datos de aduana para mezcal
- HS Code USA: **2208.90.6000** (Tequila, mezcal and other agave spirits)
- Arancel base USA: **13.2 cents/proof liter** (reducido por USMCA a $0 si califica)
- Límite de importación personal USA: **1 litro libre de arancel** (Form 6059B)
- Para envíos comerciales a USA: requiere Importer of Record + TTB aprobación
- Surgeon General Warning: obligatorio en etiqueta (27 CFR 16.21)

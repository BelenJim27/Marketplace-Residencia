# CÓMO FUNCIONA EL MARKETPLACE
> Explicación en lenguaje sencillo. Generado el 2026-06-06.

---

## ¿Qué es este marketplace?

Es una plataforma donde **productores de mezcal de Oaxaca** pueden vender sus productos directamente a clientes en México y (próximamente) en Estados Unidos.

La plataforma actúa como intermediario: recibe los pagos, cobra una comisión, y transfiere el resto a los productores.

---

## ¿Cómo compra un cliente?

### Paso 1: Descubrir productos
El cliente visita la tienda en línea (sin necesidad de crear cuenta). Puede ver todos los mezcales disponibles, filtrarlos por tipo de agave, precio, maestro mezcalero, y más.

### Paso 2: Registro
Para comprar, el cliente necesita crear una cuenta. Puede hacerlo con email/contraseña o con su cuenta de Google. Si el producto requiere verificación de edad (+18 años), el sistema le pedirá su fecha de nacimiento.

### Paso 3: Carrito
El cliente agrega productos al carrito. Si tiene sesión activa, el carrito se guarda en la nube (no se pierde si cierra el navegador). 

### Paso 4: Checkout (4 pasos)
1. **Dirección**: Ingresa dónde quiere recibir su pedido
2. **Envío**: El sistema cotiza el envío con SkydropX y muestra opciones de carriers (DHL, FedEx, Estafeta, etc.) con precio y tiempo estimado
3. **Pago**: Paga con tarjeta de crédito/débito (Stripe) o PayPal. El total incluye los productos + envío + impuestos calculados automáticamente
4. **Confirmación**: Recibe un email con el resumen de su pedido

### Paso 5: Seguimiento
El cliente puede ver el estado de su pedido en "Mis Compras". El productor actualiza el estado conforme prepara y envía el paquete.

### Paso 6: Entrega
Cuando el pedido llega, el cliente recibe su mezcal.

---

## ¿Cómo vende un productor?

### Registro como productor
1. El productor crea una cuenta normal en el marketplace
2. Solicita ser "productor" completando su perfil: nombre de marca, RFC, datos fiscales, dirección de bodega
3. Un administrador del marketplace revisa y **aprueba** (o rechaza) la solicitud
4. Al aprobarse, el productor tiene acceso a su panel de control

### Configurar su tienda
El productor crea su tienda y agrega productos con:
- Fotos, descripción, precio
- Peso y dimensiones (necesarios para calcular el envío)
- Stock disponible
- Lote de producción (para trazabilidad: fecha, grado de alcohol, especie de agave)

### Recibir pedidos
Cuando alguien compra sus productos, el productor recibe una notificación. En su panel ve:
- Qué se pidió, en qué cantidad, el precio
- Los datos del cliente para el envío
- La guía de envío generada automáticamente

### Gestionar el envío
El productor actualiza el estado del pedido:
- **Confirmado** → recibió la orden
- **Preparando** → empacando
- **Enviado** → entregado al carrier
- **Entregado** → cliente recibió el paquete

### Recibir su pago
Al confirmar que el pedido fue entregado, el sistema transfiere automáticamente el dinero al productor (menos la comisión de la plataforma).

---

## ¿Cómo gana dinero la plataforma?

La plataforma cobra una **comisión por cada venta**. Esta comisión es flexible:

- **Comisión global**: aplica a todos los productores (ejemplo: 10%)
- **Comisión por productor**: se puede negociar una tasa especial por productor (ejemplo: 7% para productores grandes)
- **Comisión por categoría**: diferentes tipos de productos pueden tener diferentes comisiones
- **Comisión por país**: puede variar según destino

**Ejemplo concreto**:
- Cliente paga $500 MXN por una botella
- Envío: $80 MXN
- Impuestos: $0 (incluido en el precio)
- **Total: $580 MXN** (va a la cuenta de la plataforma)
- La plataforma descuenta 10% de comisión = $58 MXN
- **El productor recibe: $522 MXN** (producto + parte del envío, menos comisión)

---

## ¿Cómo se calculan los envíos?

### Para pedidos nacionales (México)
1. El sistema toma el peso real de todos los productos + sus dimensiones
2. Calcula el **peso volumétrico**: `(largo × ancho × alto) / 5000`
3. Usa el mayor entre peso real y volumétrico
4. Consulta a SkydropX en tiempo real con este peso y la dirección del cliente
5. SkydropX devuelve opciones de DHL, FedEx, Estafeta, Redpack, etc. con precios

### Para pedidos internacionales (USA)
- El mismo proceso, pero SkydropX cotiza envío internacional
- Para productos con alcohol, solo se usan carriers compatibles: DHL, FedEx, Estafeta
- Se verifica que el estado de destino en USA no tenga restricciones de envío de alcohol

### Envíos en pedidos multiproductor
Si el cliente compra de 2 productores distintos, se generan **2 guías de envío separadas** (una por productor), porque cada productor envía desde su propia bodega.

---

## ¿Cómo se calculan los pagos?

### Proceso de pago
1. El frontend envía al backend: subtotal + monto de envío elegido
2. El **backend valida** que el subtotal coincide con los precios reales en BD (protección anti-manipulación)
3. El backend calcula automáticamente los **impuestos**:
   - Para México: IVA (16%) si aplica
   - Para USA: impuesto federal sobre alcohol (FET), impuestos estatales
4. Se crea el cobro en Stripe o PayPal
5. El dinero llega a la cuenta de la plataforma
6. Stripe/PayPal notifica mediante webhook que el pago fue aprobado

### Seguridad en pagos
- Los precios nunca los fija el frontend; siempre se verifican contra BD
- El monto de envío también se verifica contra las cotizaciones guardadas
- Los webhooks tienen deduplicación: si Stripe envía el mismo evento dos veces, solo se procesa una vez

---

## ¿Cómo se calculan las comisiones?

El sistema busca la comisión más específica para cada productor en este orden:

1. ¿Hay una comisión personalizada para **este productor** en específico? → La usa
2. ¿Hay una comisión para el **país** de operación? → La usa
3. ¿Hay una comisión para la **categoría** de productos? → La usa  
4. ¿Hay una comisión **global**? → La usa
5. Si no hay ninguna → Error (el checkout falla hasta que el admin configure al menos una global)

---

## ¿Cómo funcionan los pedidos multiproductor?

Cuando un cliente compra de 2 productores en el mismo carrito:

1. Se crea **un solo pedido** con todos los items
2. El sistema identifica automáticamente qué items pertenecen a qué productor
3. Crea una fila en `pedido_productor` para cada productor con:
   - Su subtotal proporcional
   - La comisión que le corresponde
   - El monto que recibirá
4. El cliente paga **una sola vez** el total completo
5. Cada productor ve **solo sus items** en su panel de productor
6. Cada productor puede actualizar el estado de **sus propios items** independientemente
7. El pago al productor ocurre cuando **su parte** es marcada como entregada

**Ejemplo**:
- Productor A: 2 botellas = $400 MXN
- Productor B: 1 botella = $300 MXN
- Total: $700 MXN
- Envío total: $160 MXN (prorrateado: A recibe $91.43, B recibe $68.57)
- Comisión 10% aplicada a cada parte por separado

---

## ¿Cómo funcionan los envíos nacionales?

### Flujo completo

```
Cliente selecciona dirección en México
        ↓
Sistema pesa todos los productos y calcula dimensiones
        ↓
Consulta a SkydropX (sandbox o producción)
        ↓
SkydropX devuelve 3-8 opciones de carriers
        ↓
Cliente elige opción (precio + tiempo)
        ↓
Paga el pedido (envío incluido en el total)
        ↓
Webhook confirma pago
        ↓
Sistema genera guía automáticamente con SkydropX
        ↓
Productor recibe número de guía y la imprime
        ↓
Carrier recoge en la bodega del productor
        ↓
Tracking actualizado automáticamente vía webhooks del carrier
```

---

## ¿Cómo funcionarían los envíos internacionales?

**Estado actual**: La infraestructura está preparada, pero depende de que SkydropX tenga cobertura internacional activa para México → USA.

### Lo que ya está implementado
- Cotización internacional vía SkydropX (soporta USA, CA, CO, ES, etc.)
- Validación de restricciones por estado USA (ejemplo: Utah y Mississippi no permiten envío directo de alcohol)
- Verificación de que el carrier soporte alcohol (DHL, FedEx, Estafeta sí; J&T Express y 99minutos no)
- Campo `codigo_hs` en la guía (código arancelario para aduana)
- Campo `valor_declarado_aduana` para declaración de valor

### Lo que falta para envíos USA reales
- Verificar que SkydropX sandbox → producción funcione para rutas México-USA
- Cada estado USA tiene leyes diferentes sobre alcohol (algunos permiten envío directo, otros requieren licencia de importador)
- Los productores necesitan trabajar con un importador registrado en USA para la mayoría de los estados

---

## Resumen del flujo de dinero

```
Cliente paga $1,000 MXN
        ↓ (Stripe/PayPal)
Cuenta de la plataforma recibe $1,000 MXN
        ↓ (cuando se confirma entrega)
Productor A recibe $400 MXN (menos 10% comisión = $360 MXN)
Productor B recibe $300 MXN (menos 10% comisión = $270 MXN)
La plataforma retiene: $100 MXN comisión + $300 MXN de envío pagado al carrier
```

El dinero **siempre pasa por la plataforma**. Nunca va directo del cliente al productor. Esto protege al comprador y permite que la plataforma resuelva disputas.

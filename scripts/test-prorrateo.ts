/**
 * Script para verificar el cálculo de prorrateo de impuestos y envío.
 * Simula el flujo: pedido con 2 productores, impuestos y envío.
 *
 * Ejecutar con: npx ts-node scripts/test-prorrateo.ts
 */

interface Detalle {
  precio_compra: number;
  cantidad: number;
  id_productor: number;
}

interface Pedido {
  tax_amount: number;
  shipping_amount: number;
}

function calcularProrrateoProductor(
  detalles: Detalle[],
  id_productor: number,
  pedido: Pedido,
) {
  // Subtotal de items del productor
  const subtotal_items_productor = detalles
    .filter((d) => d.id_productor === id_productor)
    .reduce((sum, d) => sum + d.precio_compra * d.cantidad, 0);

  // Subtotal total del pedido
  const subtotal_total_pedido = detalles.reduce(
    (sum, d) => sum + d.precio_compra * d.cantidad,
    0,
  );

  // Porcentaje del productor
  const porcentaje_productor =
    subtotal_total_pedido > 0
      ? subtotal_items_productor / subtotal_total_pedido
      : 0;

  // Prorrateo
  const tax_prorrateado =
    pedido.tax_amount * porcentaje_productor;
  const envio_prorrateado =
    pedido.shipping_amount * porcentaje_productor;

  // Subtotal bruto final
  const subtotal_bruto = Number(
    (subtotal_items_productor + tax_prorrateado + envio_prorrateado).toFixed(2),
  );

  return {
    subtotal_items: subtotal_items_productor,
    porcentaje: porcentaje_productor,
    tax_prorrateado: Number(tax_prorrateado.toFixed(2)),
    envio_prorrateado: Number(envio_prorrateado.toFixed(2)),
    subtotal_bruto,
  };
}

// Caso de prueba: Pedido #1001 del plan
const detalles: Detalle[] = [
  { precio_compra: 500, cantidad: 2, id_productor: 1 }, // Productor A: 1000
  { precio_compra: 150, cantidad: 3, id_productor: 2 }, // Productor B: 450
];

const pedido: Pedido = {
  tax_amount: 232, // IVA total
  shipping_amount: 120, // Envío total
};

console.log("=== TEST DE PRORRATEO ===\n");
console.log("Pedido Total:");
console.log(`  Items totales: $${detalles.reduce((sum, d) => sum + d.precio_compra * d.cantidad, 0)} MXN`);
console.log(`  IVA: $${pedido.tax_amount} MXN`);
console.log(`  Envío: $${pedido.shipping_amount} MXN`);
console.log(
  `  TOTAL PEDIDO: $${detalles.reduce((sum, d) => sum + d.precio_compra * d.cantidad, 0) + pedido.tax_amount + pedido.shipping_amount} MXN\n`,
);

// Productor A
const prodA = calcularProrrateoProductor(detalles, 1, pedido);
console.log("Productor A (mezcal artesanal):");
console.log(`  Items: $${prodA.subtotal_items} MXN`);
console.log(`  % del pedido: ${(prodA.porcentaje * 100).toFixed(2)}%`);
console.log(`  IVA prorrateado: $${prodA.tax_prorrateado} MXN`);
console.log(`  Envío prorrateado: $${prodA.envio_prorrateado} MXN`);
console.log(`  SUBTOTAL BRUTO: $${prodA.subtotal_bruto} MXN\n`);

// Productor B
const prodB = calcularProrrateoProductor(detalles, 2, pedido);
console.log("Productor B (mezcal joven):");
console.log(`  Items: $${prodB.subtotal_items} MXN`);
console.log(`  % del pedido: ${(prodB.porcentaje * 100).toFixed(2)}%`);
console.log(`  IVA prorrateado: $${prodB.tax_prorrateado} MXN`);
console.log(`  Envío prorrateado: $${prodB.envio_prorrateado} MXN`);
console.log(`  SUBTOTAL BRUTO: $${prodB.subtotal_bruto} MXN\n`);

// Verificación: suma debe ser igual al total
const suma_verificacion = Number(
  (prodA.subtotal_bruto + prodB.subtotal_bruto).toFixed(2),
);
const total_esperado = Number(
  (detalles.reduce((sum, d) => sum + d.precio_compra * d.cantidad, 0) +
    pedido.tax_amount +
    pedido.shipping_amount).toFixed(2),
);

console.log("=== VERIFICACIÓN ===");
console.log(`Suma de productores: $${suma_verificacion} MXN`);
console.log(`Total pedido: $${total_esperado} MXN`);
console.log(
  `✅ CORRECTO: ${suma_verificacion === total_esperado ? "SÍ" : "NO"}`,
);
console.log(
  `Diferencia: $${(suma_verificacion - total_esperado).toFixed(2)} MXN`,
);

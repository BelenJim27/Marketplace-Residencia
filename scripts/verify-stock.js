#!/usr/bin/env node

/**
 * verify-stock.js
 * ================
 * Script para verificar la integridad y movimientos de stock
 * 
 * Uso:
 *   node scripts/verify-stock.js
 *   node scripts/verify-stock.js --product-id=123
 *   node scripts/verify-stock.js --pedido-id=456
 * 
 * Requiere: DATABASE_URL configurada
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function header(text) {
  console.log(`\n${colors.cyan}${'='.repeat(80)}`);
  console.log(`${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

async function getLastMovimientos(limit = 30) {
  header('📊 ÚLTIMOS MOVIMIENTOS DE STOCK');

  const movimientos = await prisma.movimientos_inventario.findMany({
    take: limit,
    orderBy: { creado_en: 'desc' },
    include: {
      pedidos: { select: { id_pedido: true, estado: true } },
      inventario: {
        select: {
          stock: true,
          productos: { select: { id_producto: true, nombre: true } },
        },
      },
    },
  });

  if (movimientos.length === 0) {
    log(colors.yellow, '⚠️  No hay movimientos registrados');
    return;
  }

  movimientos.forEach((m) => {
    const cambio =
      m.tipo === 'venta'
        ? `${colors.red}-${m.cantidad}${colors.reset}`
        : m.tipo === 'cancelacion'
          ? `${colors.green}+${m.cantidad}${colors.reset}`
          : `±${m.cantidad}`;

    console.log(
      `${colors.gray}${m.creado_en.toLocaleString()}${colors.reset} | ` +
      `${m.inventario?.productos?.nombre || 'N/A'} | ` +
      `${m.tipo.padEnd(12)} | ${cambio} | ` +
      `Stock: ${m.stock_resultante} | ` +
      `Pedido: ${m.pedidos?.id_pedido || 'N/A'} (${m.pedidos?.estado || 'N/A'})`
    );
  });
}

async function getStockSummary() {
  header('📈 RESUMEN DE STOCK');

  const productos = await prisma.inventario.findMany({
    include: {
      productos: { select: { nombre: true } },
    },
    orderBy: { stock: 'desc' },
    take: 10,
  });

  const totalStock = await prisma.inventario.aggregate({
    _sum: { stock: true },
    _avg: { stock: true },
    _min: { stock: true },
  });

  console.log(
    `Total productos: ${await prisma.inventario.count()}\n` +
    `Stock total: ${colors.green}${totalStock._sum.stock || 0}${colors.reset}\n` +
    `Promedio por producto: ${(totalStock._avg.stock || 0).toFixed(2)}\n` +
    `Stock mínimo: ${totalStock._min.stock || 0}\n`
  );

  log(colors.cyan, '\nTop 10 productos por stock:');
  productos.forEach((inv, idx) => {
    const warning =
      inv.stock === 0
        ? colors.red + ' ❌ AGOTADO'
        : inv.stock <= 10
          ? colors.yellow + ' ⚠️  BAJO'
          : colors.green + ' ✅';
    console.log(
      `${(idx + 1).toString().padStart(2)}. ${inv.productos.nombre.padEnd(40)} ${inv.stock
        .toString()
        .padStart(5)}${warning}${colors.reset}`
    );
  });
}

async function getMovementsByType() {
  header('📊 MOVIMIENTOS POR TIPO');

  const byType = await prisma.movimientos_inventario.groupBy({
    by: ['tipo'],
    _count: true,
    _sum: { cantidad: true },
  });

  byType.forEach((group) => {
    const color =
      group.tipo === 'venta' ? colors.red : group.tipo === 'cancelacion' ? colors.green : colors.yellow;
    console.log(
      `${color}${group.tipo.padEnd(15)}${colors.reset} | ` +
      `Movimientos: ${group._count} | ` +
      `Total cantidad: ${group._sum.cantidad || 0}`
    );
  });
}

async function getAlertasStock() {
  header('🚨 ALERTAS DE STOCK');

  const alertas = await prisma.inventario.findMany({
    where: {
      stock: {
        lte: 10,
      },
    },
    include: {
      productos: { select: { nombre: true } },
    },
    orderBy: { stock: 'asc' },
  });

  if (alertas.length === 0) {
    log(colors.green, '✅ No hay alertas. Stock en niveles normales.');
    return;
  }

  log(colors.yellow, `⚠️  ${alertas.length} productos con stock bajo:\n`);
  alertas.forEach((inv) => {
    const status = inv.stock === 0 ? '❌ AGOTADO' : '⚠️  BAJO';
    console.log(
      `  ${inv.productos.nombre.padEnd(40)} | Stock: ${inv.stock
        .toString()
        .padStart(3)}  ${status}`
    );
  });
}

async function getPedidosActivos() {
  header('🛒 PEDIDOS ACTIVOS CON DETALLES');

  const pedidos = await prisma.pedidos.findMany({
    where: {
      estado: {
        in: ['pendiente', 'pagado', 'label_purchased'],
      },
    },
    include: {
      detalle_pedido: {
        include: {
          productos: { select: { nombre: true } },
          inventario: { select: { stock: true } },
        },
      },
    },
    orderBy: { fecha_creacion: 'desc' },
    take: 10,
  });

  if (pedidos.length === 0) {
    log(colors.gray, 'No hay pedidos activos.');
    return;
  }

  pedidos.forEach((ped) => {
    const total = ped.detalle_pedido.reduce((sum, det) => sum + det.cantidad, 0);
    const color =
      ped.estado === 'pagado' ? colors.green : ped.estado === 'cancelado' ? colors.red : colors.yellow;
    console.log(`\n${colors.blue}Pedido ${ped.id_pedido}${colors.reset} | ${color}${ped.estado}${colors.reset}`);
    console.log(`Fecha: ${ped.fecha_creacion.toLocaleString()}`);
    console.log(`Items: ${ped.detalle_pedido.length} | Total cantidad: ${total}\n`);

    ped.detalle_pedido.forEach((det) => {
      const warning =
        det.inventario && det.inventario.stock < det.cantidad
          ? colors.red + ' ⚠️  INSUFICIENTE'
          : colors.green + ' ✅';
      console.log(
        `  - ${det.productos.nombre.padEnd(40)} x${det.cantidad
          .toString()
          .padStart(3)} (${det.inventario?.stock || 0} disponible)${warning}${colors.reset}`
      );
    });
  });
}

async function verifyCancelaciones() {
  header('↩️  VERIFICACIÓN DE CANCELACIONES');

  const canceladas = await prisma.pedidos.findMany({
    where: {
      estado: 'cancelado',
      actualizado_en: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 días
      },
    },
    include: {
      detalle_pedido: {
        include: {
          productos: { select: { nombre: true } },
        },
      },
    },
    orderBy: { actualizado_en: 'desc' },
    take: 10,
  });

  if (canceladas.length === 0) {
    log(colors.gray, 'No hay cancelaciones recientes.');
    return;
  }

  log(colors.yellow, `Cancelaciones en los últimos 7 días: ${canceladas.length}\n`);

  canceladas.forEach((ped) => {
    console.log(`${colors.blue}Pedido ${ped.id_pedido}${colors.reset} cancelado en ${ped.actualizado_en.toLocaleString()}`);
    const total = ped.detalle_pedido.reduce((sum, det) => sum + det.cantidad, 0);
    console.log(`Items cancelados: ${total}`);
    ped.detalle_pedido.forEach((det) => {
      console.log(`  - ${det.productos.nombre} x${det.cantidad}`);
    });
    console.log();
  });
}

async function main() {
  try {
    log(colors.cyan, '\n🔍 VERIFICADOR DE STOCK - Marketplace Residencia\n');

    await getStockSummary();
    await getMovementsByType();
    await getLastMovimientos(20);
    await getAlertasStock();
    await getPedidosActivos();
    await verifyCancelaciones();

    log(colors.green, '\n✅ Verificación completada exitosamente.\n');
  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}\n`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

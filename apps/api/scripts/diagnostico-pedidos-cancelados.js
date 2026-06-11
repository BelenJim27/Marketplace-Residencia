// Diagnóstico (SOLO LECTURA): identifica pedidos cancelados por el cron de
// expiración (expirarPedidosPendientes) que en realidad tenían un pago cobrado
// — es decir, falsos positivos por webhook de pago perdido o tardío.
//
// Uso: node apps/api/scripts/diagnostico-pedidos-cancelados.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // 1) Cancelaciones atribuibles al cron (no a reembolsos de admin).
  const expiraciones = await prisma.auditoria.findMany({
    where: { accion: 'expirar_pedido_sin_pago', tabla_afectada: 'pedidos' },
    select: { registro_id: true },
  });
  const idsExpirados = [
    ...new Set(expiraciones.map((a) => a.registro_id).filter(Boolean)),
  ];
  console.log(`Pedidos cancelados por el cron (expirar_pedido_sin_pago): ${idsExpirados.length}`);

  if (idsExpirados.length === 0) {
    console.log('No hay cancelaciones automáticas registradas. Nada que diagnosticar.');
    return;
  }

  // registro_id se guarda como String(id_pedido); convertir a BigInt para el match.
  const idsBig = idsExpirados
    .map((s) => {
      try { return BigInt(s); } catch { return null; }
    })
    .filter((v) => v !== null);

  // 2) De esos pedidos cancelados, cuáles tienen un pago cobrado => falsos positivos.
  const falsosPositivos = await prisma.pedidos.findMany({
    where: {
      id_pedido: { in: idsBig },
      estado: 'cancelado',
      pagos: { some: { estado: { in: ['completado', 'reembolsado'] } } },
    },
    select: {
      id_pedido: true,
      total: true,
      moneda: true,
      fecha_creacion: true,
      pagos: {
        select: {
          id_pago: true,
          estado: true,
          monto: true,
          payment_intent_id: true,
          creado_en: true,
        },
      },
    },
    orderBy: { fecha_creacion: 'desc' },
  });

  console.log('');
  console.log(`⚠️  FALSOS POSITIVOS (cancelado por cron pero CON pago cobrado): ${falsosPositivos.length}`);
  console.log(`✅  Abandonos legítimos (sin pago cobrado): ${idsExpirados.length - falsosPositivos.length}`);
  console.log('');

  if (falsosPositivos.length > 0) {
    console.log('Detalle de falsos positivos (requieren remediación manual):');
    for (const p of falsosPositivos) {
      const pagoCobrado = p.pagos.find((pg) =>
        ['completado', 'reembolsado'].includes(pg.estado),
      );
      console.log(
        `  pedido=${p.id_pedido} total=${p.total} ${p.moneda} creado=${p.fecha_creacion.toISOString()} ` +
        `| pago id=${pagoCobrado?.id_pago} estado=${pagoCobrado?.estado} ` +
        `monto=${pagoCobrado?.monto} intent=${pagoCobrado?.payment_intent_id ?? '—'}`,
      );
    }
    console.log('');
    console.log('Estos pedidos cobraron al cliente pero quedaron cancelados.');
    console.log('Decidir remediación: re-marcar como "pagado" + (si aplica) regenerar guías, o reembolsar.');
  }
}

main()
  .catch((e) => {
    console.error('Error en diagnóstico:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

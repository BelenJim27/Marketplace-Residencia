/* DEV ONLY — simula la finalización de etiqueta que en producción haría el webhook/refresh
 * de SkydropX, para poder ver el botón "Rastrear mi paquete" en /tienda/compras/144.
 *   node scripts/sim-tracking-144.js            -> aplica el número de prueba
 *   node scripts/sim-tracking-144.js --revert   -> revierte a estado in_creation real
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const n = (o) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
const TEST_TRACKING = 'TEST1234567890';

async function main() {
  const revert = process.argv.includes('--revert');
  const envio = await prisma.envios.findFirst({
    where: { id_pedido: 144n }, orderBy: { id_envio: 'desc' },
    include: { envio_guias: { where: { eliminado_en: null }, orderBy: { fecha_creacion: 'desc' }, take: 1 } },
  });
  if (!envio) { console.log('No hay envío para el pedido 144.'); return; }
  const guia = envio.envio_guias[0];

  if (revert) {
    await prisma.envios.update({ where: { id_envio: envio.id_envio }, data: { numero_rastreo: null, estado: 'in_creation' } });
    if (guia) await prisma.envio_guias.update({ where: { id_guia: guia.id_guia }, data: { estado_paqueteria: 'in_creation' } });
    console.log('↩  Revertido a in_creation (numero_rastreo=null).');
  } else {
    await prisma.envios.update({ where: { id_envio: envio.id_envio }, data: { numero_rastreo: TEST_TRACKING, estado: 'label_purchased' } });
    if (guia) await prisma.envio_guias.update({ where: { id_guia: guia.id_guia }, data: { estado_paqueteria: 'creada', numero_guia: TEST_TRACKING } });
    console.log(`✓ Simulado numero_rastreo=${TEST_TRACKING}, estado=label_purchased.`);
  }

  const final = await prisma.envios.findUnique({
    where: { id_envio: envio.id_envio },
    select: { id_envio: true, estado: true, numero_rastreo: true,
      envio_guias: { where: { eliminado_en: null }, select: { estado_paqueteria: true, numero_guia: true } } },
  });
  console.log('Estado:', JSON.stringify(n(final)));
}
main().catch((e) => { console.error('FATAL:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

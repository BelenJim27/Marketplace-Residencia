/**
 * Pobla restricciones_envio_categoria para envíos de alcohol (mezcal) hacia estados de EE. UU.
 *
 * Estados marcados como NO PERMITIDOS son aquellos que:
 * - Prohíben el envío directo al consumidor de spirits importados, O
 * - Requieren licencias estatales que una operación de exportación desde México no puede obtener
 *
 * Ejecutar desde apps/api/:
 *   node scripts/seed-restricciones-usa.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Estados que NO permiten envío directo de spirits importados (mezcal)
const ESTADOS_BLOQUEADOS = [
  { codigo: 'AL', nombre: 'Alabama',      motivo: 'Estado de control. Prohíbe importación directa sin licencia ABCA estatal.' },
  { codigo: 'AR', nombre: 'Arkansas',     motivo: 'Prohíbe envío directo de spirits al consumidor.' },
  { codigo: 'KS', nombre: 'Kansas',       motivo: 'Prohíbe la recepción de alcohol enviado directamente desde fuera del estado.' },
  { codigo: 'MS', nombre: 'Mississippi',  motivo: 'Estado parcialmente seco. Sin envío directo de spirits importados.' },
  { codigo: 'OK', nombre: 'Oklahoma',     motivo: 'Requiere licencia estatal de importación que exportadores MX no pueden obtener.' },
  { codigo: 'UT', nombre: 'Utah',         motivo: 'Estado de control estricto (DABC). Todo alcohol pasa por el estado.' },
];

async function main() {
  console.log('🌍 Iniciando seed de restricciones de envío USA...\n');

  // Buscar la categoría de mezcal/destilados
  const categorias = await prisma.categorias.findMany({
    where: {
      OR: [
        { nombre: { contains: 'mezcal', mode: 'insensitive' } },
        { nombre: { contains: 'destilado', mode: 'insensitive' } },
        { nombre: { contains: 'licor', mode: 'insensitive' } },
        { nombre: { contains: 'alcohol', mode: 'insensitive' } },
        { nombre: { contains: 'bebida', mode: 'insensitive' } },
        { requiere_edad_minima: { gte: 18 } },
      ],
    },
    select: { id_categoria: true, nombre: true },
  });

  if (categorias.length === 0) {
    console.error('❌ No se encontraron categorías de alcohol/mezcal. Ejecuta seed-base.js primero.');
    process.exit(1);
  }

  console.log(`📦 Categorías encontradas (${categorias.length}):`);
  categorias.forEach(c => console.log(`   • [${c.id_categoria}] ${c.nombre}`));

  // Verificar que el país US exista
  const paisUS = await prisma.paises.findUnique({ where: { iso2: 'US' } });
  if (!paisUS) {
    console.error('❌ País US no encontrado. Ejecuta seed-internacionalizacion.js primero.');
    process.exit(1);
  }

  let creadas = 0;
  let existentes = 0;

  for (const estado of ESTADOS_BLOQUEADOS) {
    for (const cat of categorias) {
      try {
        await prisma.restricciones_envio_categoria.upsert({
          where: {
            pais_iso2_estado_codigo_id_categoria: {
              pais_iso2: 'US',
              estado_codigo: estado.codigo,
              id_categoria: cat.id_categoria,
            },
          },
          create: {
            pais_iso2: 'US',
            estado_codigo: estado.codigo,
            id_categoria: cat.id_categoria,
            permitido: false,
            notas: estado.motivo,
            vigente_desde: new Date(),
          },
          update: {
            permitido: false,
            notas: estado.motivo,
          },
        });
        creadas++;
      } catch (err) {
        if (err?.code === 'P2002') {
          existentes++;
        } else {
          console.warn(`  ⚠️  ${estado.codigo} / cat ${cat.id_categoria}: ${err?.message}`);
        }
      }
    }
    console.log(`  ✓ ${estado.codigo} (${estado.nombre}) — bloqueado para ${categorias.length} categoría(s)`);
  }

  // Activar US para ventas y envíos
  await prisma.paises.update({
    where: { iso2: 'US' },
    data: { activo_venta: true, activo_envio: true },
  });
  console.log('\n  ✓ US marcado como activo_venta=true, activo_envio=true');

  console.log(`\n✅ Listo. Restricciones creadas: ${creadas} | Ya existían: ${existentes}`);
  console.log('\nEstados BLOQUEADOS para envío de mezcal:');
  ESTADOS_BLOQUEADOS.forEach(e => console.log(`   🚫 ${e.codigo} — ${e.nombre}`));
  console.log('\nTodos los demás estados USA permiten el envío (sujeto a validación de edad).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

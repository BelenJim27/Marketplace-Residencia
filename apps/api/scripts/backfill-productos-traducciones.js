/**
 * Backfill: copia productos.traducciones (Json) → tabla productos_traducciones.
 *
 * Formato esperado del Json:
 *   { "en": { "nombre": "...", "descripcion": "...", "metadata": {...} }, "fr": {...} }
 * Idiomas no registrados en la tabla `idiomas` se omiten (con warning).
 * Idempotente: usa upsert por (id_producto, idioma).
 *
 * Uso:
 *   node apps/api/scripts/backfill-productos-traducciones.js
 *   node apps/api/scripts/backfill-productos-traducciones.js --dry-run
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`🌐 Backfill productos.traducciones → productos_traducciones${DRY_RUN ? ' (dry-run)' : ''}`);

  const idiomasValidos = new Set(
    (await prisma.idiomas.findMany({ select: { codigo: true } })).map((i) => i.codigo),
  );
  if (idiomasValidos.size === 0) {
    console.error('❌ No hay idiomas registrados. Ejecuta seed-internacionalizacion.js primero.');
    process.exit(1);
  }
  console.log(`  Idiomas válidos: ${[...idiomasValidos].join(', ')}`);

  const productos = await prisma.productos.findMany({
    where: { eliminado_en: null },
    select: { id_producto: true, traducciones: true, nombre: true, descripcion: true },
  });
  console.log(`  Productos a evaluar: ${productos.length}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let warnings = 0;

  for (const p of productos) {
    const traducciones = p.traducciones;
    if (!traducciones || typeof traducciones !== 'object' || Array.isArray(traducciones)) {
      skipped++;
      continue;
    }

    for (const [idioma, valor] of Object.entries(traducciones)) {
      if (!idiomasValidos.has(idioma)) {
        console.warn(`  ⚠️  Idioma no registrado "${idioma}" en producto ${p.id_producto} — skip`);
        warnings++;
        continue;
      }
      if (!valor || typeof valor !== 'object') continue;

      const nombre = (valor.nombre || valor.name || '').toString().trim();
      if (!nombre) continue;
      const descripcion = valor.descripcion || valor.description || null;
      const metadata = valor.metadata && typeof valor.metadata === 'object' ? valor.metadata : {};

      if (DRY_RUN) {
        console.log(`  [dry] producto=${p.id_producto} idioma=${idioma} nombre="${nombre.slice(0, 40)}"`);
        inserted++;
        continue;
      }

      const existing = await prisma.productos_traducciones.findUnique({
        where: { id_producto_idioma: { id_producto: p.id_producto, idioma } },
      });
      if (existing) {
        await prisma.productos_traducciones.update({
          where: { id_producto_idioma: { id_producto: p.id_producto, idioma } },
          data: { nombre, descripcion, metadata, actualizado_en: new Date() },
        });
        updated++;
      } else {
        await prisma.productos_traducciones.create({
          data: { id_producto: p.id_producto, idioma, nombre, descripcion, metadata },
        });
        inserted++;
      }
    }
  }

  console.log('\n✅ Backfill completado');
  console.log(`   Insertadas:   ${inserted}`);
  console.log(`   Actualizadas: ${updated}`);
  console.log(`   Sin Json:     ${skipped}`);
  console.log(`   Warnings:     ${warnings}`);
}

main()
  .catch((err) => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

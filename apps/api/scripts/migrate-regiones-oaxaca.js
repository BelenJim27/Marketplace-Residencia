/**
 * Migra las regiones existentes en la BD a las 8 regiones de Oaxaca de Juárez.
 * Actualiza los registros existentes en orden de id_region para preservar
 * las referencias en tablas relacionadas (productores, lotes, etc.).
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const OAXACA_REGIONES = [
  'Valles Centrales',
  'Sierra Norte',
  'Sierra Sur',
  'Mixteca',
  'Cañada',
  'Papaloapan',
  'Istmo',
  'Costa',
];

async function main() {
  console.log('🌱 Migrando regiones a las 8 regiones de Oaxaca de Juárez...\n');

  const existing = await prisma.regiones.findMany({ orderBy: { id_region: 'asc' } });
  console.log(`  Regiones actuales en BD: ${existing.length}`);

  // Actualizar las que ya existen
  for (let i = 0; i < Math.min(existing.length, OAXACA_REGIONES.length); i++) {
    await prisma.regiones.update({
      where: { id_region: existing[i].id_region },
      data: { nombre: OAXACA_REGIONES[i], estado_prov: 'Oaxaca', pais_iso2: 'MX', activo: true },
    });
    console.log(`  ✓ Actualizado id=${existing[i].id_region}: "${existing[i].nombre}" → "${OAXACA_REGIONES[i]}"`);
  }

  // Crear las que falten si la BD tiene menos de 8
  for (let i = existing.length; i < OAXACA_REGIONES.length; i++) {
    const creado = await prisma.regiones.create({
      data: { nombre: OAXACA_REGIONES[i], estado_prov: 'Oaxaca', pais_iso2: 'MX', activo: true },
    });
    console.log(`  ✓ Creado id=${creado.id_region}: "${OAXACA_REGIONES[i]}"`);
  }

  // Desactivar las que sobren si la BD tiene más de 8
  for (let i = OAXACA_REGIONES.length; i < existing.length; i++) {
    await prisma.regiones.update({
      where: { id_region: existing[i].id_region },
      data: { activo: false },
    });
    console.log(`  ⚠ Desactivado id=${existing[i].id_region}: "${existing[i].nombre}" (sin región Oaxaca asignada)`);
  }

  console.log('\n✅ Migración completada.');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TIENDAS = [
  { nombre: 'Casa Ramírez Mezcal', descripcion: 'Tienda de mezcal artesanal' },
  { nombre: 'Destilados del Valle', descripcion: 'Mezcales tradicionales de Oaxaca' },
  { nombre: 'Mezcales Ana López', descripcion: 'Produccion propia de mezcal' },
];

async function main() {
  console.log('🌱 Starting tiendas seed...\n');

  try {
    console.log('=== Tiendas ===');
    const tiendasCreadas = [];

    for (const t of TIENDAS) {
      const existing = await prisma.tiendas.findFirst({ where: { nombre: t.nombre } });
      if (existing) {
        console.log(`  ✓ Already exists: ${t.nombre}`);
        tiendasCreadas.push(existing);
        continue;
      }

      const productores = await prisma.productores.findMany({
        where: { eliminado_en: null },
        include: { usuarios: true },
      });

      if (productores.length === 0) {
        console.log(`  ⚠ No productores found, skipping: ${t.nombre}`);
        continue;
      }

      const producer = productores.find((p) =>
        p.usuarios?.email?.includes(t.nombre.toLowerCase().replace(/\s/g, ''))
      ) || productores[0];

      const tienda = await prisma.tiendas.create({
        data: {
          nombre: t.nombre,
          descripcion: t.descripcion,
          id_productor: producer.id_productor,
          pais_operacion: 'MX',
          status: 'activa',
        },
      });
      console.log(`  ✓ Created: ${t.nombre} (Productor: ${producer.usuarios?.nombre})`);
      tiendasCreadas.push(tienda);
    }

    console.log('\n=== Lotes (para productores) ===');
    const LOTES = [
      { codigo_lote: 'LOTE-ESPADIN-001', sitio: 'Santiago Matatlán', id_productor: 1 },
      { codigo_lote: 'LOTE-TOBALA-001', sitio: 'San Baltazar', id_productor: 1 },
      { codigo_lote: 'LOTE-CUISHE-001', suelo: 'Mitla', id_productor: 2 },
    ];

    for (const l of LOTES) {
      const existing = await prisma.lotes.findUnique({ where: { codigo_lote: l.codigo_lote } });
      if (existing) {
        console.log(`  ✓ Already exists: ${l.codigo_lote}`);
      } else {
        const region = await prisma.regiones.findFirst({ where: { nombre: 'Oaxaca' } });
        await prisma.lotes.create({
          data: {
            codigo_lote: l.codigo_lote,
            sitio: l.sitio,
            id_productor: l.id_productor,
            id_region: region?.id_region,
            estado_lote: 'disponible',
            datos_api: {
              tipo_mezcal: 'Joven',
              mago: 'Espadín',
              destilacion: 'Tercer agua',
              molienda: 'Tahona',
            },
          },
        });
        console.log(`  ✓ Created: ${l.codigo_lote}`);
      }
    }

    console.log('\n✅ Tiendas seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
// Script para asignar lotes a productos según productor
const { PrismaClient } = require('./packages/database/dist/index.js');
const prisma = new PrismaClient();

async function assignLotes() {
  try {
    // 1. Obtener todos los productos sin lote
    const productosSinLote = await prisma.productos.findMany({
      where: { id_lote: null },
      include: { tiendas: { include: { productores: true } } },
    });

    console.log(`📦 Encontrados ${productosSinLote.length} productos sin lote\n`);

    let asignados = 0;
    let skipped = 0;

    for (const producto of productosSinLote) {
      const tienda = producto.tiendas;
      if (!tienda) {
        console.log(`⏭️  Producto ${producto.id_producto}: no tiene tienda`);
        skipped++;
        continue;
      }

      const productor = tienda.productores;
      if (!productor) {
        console.log(`⏭️  Producto ${producto.id_producto}: tienda sin productor`);
        skipped++;
        continue;
      }

      // Encontrar el lote más reciente del productor
      const lote = await prisma.lotes.findFirst({
        where: { id_productor: productor.id_productor },
        orderBy: { creado_en: 'desc' },
      });

      if (!lote) {
        console.log(`⏭️  Producto ${producto.id_producto}: productor sin lotes`);
        skipped++;
        continue;
      }

      // Asignar el lote
      await prisma.productos.update({
        where: { id_producto: producto.id_producto },
        data: { id_lote: lote.id_lote },
      });

      console.log(`✅ Producto ${producto.id_producto} → Lote ${lote.id_lote}`);
      asignados++;
    }

    console.log(`\n📊 Resumen:`);
    console.log(`✅ Asignados: ${asignados}`);
    console.log(`⏭️  Omitidos: ${skipped}`);
    console.log(`📦 Total: ${asignados + skipped}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignLotes();

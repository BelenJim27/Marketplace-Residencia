const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'packages/database/node_modules/.prisma/client'));

const prisma = new PrismaClient();

(async () => {
  try {
    const total = await prisma.productos.count();
    const sinLote = await prisma.productos.count({ where: { id_lote: null } });
    const conLote = await prisma.productos.count({ where: { id_lote: { not: null } } });

    console.log(`\n📊 ESTADO DE LOTES EN PRODUCTOS:\n`);
    console.log(`✓ Total de productos: ${total}`);
    console.log(`✗ Sin lote asociado: ${sinLote} (${total ? ((sinLote/total)*100).toFixed(1) : 0}%)`);
    console.log(`✓ Con lote asociado: ${conLote} (${total ? ((conLote/total)*100).toFixed(1) : 0}%)`);

    if (sinLote > 0) {
      console.log(`\n📋 Primeros 10 productos sin lote:\n`);
      const productos = await prisma.productos.findMany({
        where: { id_lote: null },
        select: {
          id_producto: true,
          nombre: true,
          tiendas: { select: { nombre: true } }
        },
        take: 10
      });

      productos.forEach(p => {
        const tienda = p.tiendas?.nombre || 'N/A';
        console.log(`  ID: ${String(p.id_producto).padEnd(5)} | ${p.nombre.substring(0, 30).padEnd(30)} | Tienda: ${tienda}`);
      });
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();

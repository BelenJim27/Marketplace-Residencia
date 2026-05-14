const { PrismaClient } = require('@marketplace-residencia/database');

const prisma = new PrismaClient();

(async () => {
  try {
    const total = await prisma.productos.count();
    const sinLote = await prisma.productos.count({ where: { id_lote: null } });
    const conLote = await prisma.productos.count({ where: { id_lote: { not: null } } });

    console.log(`\n📊 ESTADO DE LOTES EN PRODUCTOS:\n`);
    console.log(`✓ Total de productos: ${total}`);
    console.log(`✗ Sin lote asociado: ${sinLote} (${((sinLote/total)*100).toFixed(1)}%)`);
    console.log(`✓ Con lote asociado: ${conLote} (${((conLote/total)*100).toFixed(1)}%)`);

    if (sinLote > 0) {
      console.log(`\n📋 Primeros 10 productos sin lote:\n`);
      const productos = await prisma.productos.findMany({
        where: { id_lote: null },
        select: {
          id_producto: true,
          nombre: true,
          tiendas: { select: { nombre: true, productores: { select: { usuarios: { select: { nombre: true } } } } } }
        },
        take: 10
      });

      productos.forEach(p => {
        const tienda = p.tiendas?.nombre || 'N/A';
        const productor = p.tiendas?.productores?.usuarios?.nombre || 'N/A';
        console.log(`  ID: ${p.id_producto.toString().padEnd(5)} | ${p.nombre.padEnd(30)} | Tienda: ${tienda.padEnd(20)} | Productor: ${productor}`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();

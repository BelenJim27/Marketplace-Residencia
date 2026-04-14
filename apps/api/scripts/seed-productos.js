require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PRODUCTOS = [
  {
    nombre: 'Mezcal Espadín Joven 750ml',
    descripcion: 'Mezcal tradicional elaborado de agave Espadín, destilado en cobre',
    precio_base: 680,
    id_tienda: 1,
    id_lote: 1,
    peso_kg: 1.5,
    alto_cm: 30,
    ancho_cm: 10,
    largo_cm: 10,
  },
  {
    nombre: 'Mezcal Tobalá Reserva 750ml',
    descripcion: 'Mezcal PREMIUM de agave Tobalá, producción limitada',
    precio_base: 1800,
    id_tienda: 1,
    id_lote: 2,
    peso_kg: 1.6,
    alto_cm: 32,
    ancho_cm: 10,
    largo_cm: 10,
  },
  {
    nombre: 'Mezcal Ensamble Artesanal 750ml',
    descripcion: 'Blend de agaves silvestres',
    precio_base: 420,
    id_tienda: 2,
    id_lote: null,
    peso_kg: 1.4,
    alto_cm: 28,
    ancho_cm: 9,
    largo_cm: 9,
  },
  {
    nombre: 'Mezcal Cuishe Edición Limitada 750ml',
    descripcion: 'De agave Cuishe silvestre',
    precio_base: 320,
    id_tienda: 2,
    id_lote: 3,
    peso_kg: 1.3,
    alto_cm: 28,
    ancho_cm: 9,
    largo_cm: 9,
  },
  {
    nombre: 'Mezcal Mexicano Silvestre 750ml',
    descripcion: 'Mezcal de agave Mexicano',
    precio_base: 950,
    id_tienda: 3,
    id_lote: null,
    peso_kg: 1.5,
    alto_cm: 30,
    ancho_cm: 10,
    largo_cm: 10,
  },
];

async function main() {
  console.log('🌱 Starting productos seed...\n');

  try {
    const productores = await prisma.productores.findMany({
      where: { eliminado_en: null },
      include: { usuarios: true },
    });
    const producer = productores[0];
    const userId = producer?.id_usuario;

    console.log('=== Productos ===');
    for (const p of PRODUCTOS) {
      const existing = await prisma.productos.findFirst({
        where: { nombre: p.nombre, id_tienda: p.id_tienda },
      });
      if (existing) {
        console.log(`  ✓ Already exists: ${p.nombre}`);
        continue;
      }

      const producto = await prisma.productos.create({
        data: {
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio_base: p.precio_base,
          moneda_base: 'MXN',
          id_tienda: p.id_tienda,
          id_lote: p.id_lote,
          peso_kg: p.peso_kg,
          alto_cm: p.alto_cm,
          ancho_cm: p.ancho_cm,
          largo_cm: p.largo_cm,
          status: 'activo',
          creado_por: userId,
          actualizado_por: userId,
        },
      });
      console.log(`  ✓ Created: ${p.nombre} ($${p.precio_base})`);

      await prisma.inventario.create({
        data: {
          id_producto: producto.id_producto,
          stock: Math.floor(Math.random() * 50) + 10,
          stock_minimo: 5,
        },
      });
    }

    console.log('\n✅ Productos seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
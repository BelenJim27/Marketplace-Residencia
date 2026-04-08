require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TARGET_PRODUCER_NAME = "Carlos";
const TARGET_STORE_NAMES = ["Casa Ramirez Mezcal", "Destilados del Valle"];
const SEED_MARKER = "dashboard-productor-seed";

const PRODUCTS = [
  { nombre: "Mezcal Espadín Joven 750ml", precio_base: 680, store: "Casa Ramirez Mezcal" },
  { nombre: "Mezcal Tobalá Reserva", precio_base: 1800, store: "Casa Ramirez Mezcal" },
  { nombre: "Mezcal Ensamble Artesanal", precio_base: 420, store: "Casa Ramirez Mezcal" },
  { nombre: "Mezcal Cuishe Edición Limitada", precio_base: 320, store: "Destilados del Valle" },
  { nombre: "Mezcal Mexicano Silvestre", precio_base: 950, store: "Destilados del Valle" },
];

const SALES_SCHEDULE = [
  { daysAgo: 1, status: "completada", cantidad: 2, productIndex: 0 },
  { daysAgo: 2, status: "pendiente", cantidad: 1, productIndex: 1 },
  { daysAgo: 3, status: "cancelada", cantidad: 3, productIndex: 2 },
  { daysAgo: 4, status: "completada", cantidad: 4, productIndex: 3 },
  { daysAgo: 5, status: "completada", cantidad: 2, productIndex: 4 },
  { daysAgo: 8, status: "completada", cantidad: 1, productIndex: 0 },
  { daysAgo: 12, status: "pendiente", cantidad: 5, productIndex: 1 },
  { daysAgo: 16, status: "cancelada", cantidad: 2, productIndex: 2 },
  { daysAgo: 21, status: "completada", cantidad: 3, productIndex: 3 },
  { daysAgo: 28, status: "pendiente", cantidad: 4, productIndex: 4 },
  { daysAgo: 40, status: "completada", cantidad: 2, productIndex: 0 },
  { daysAgo: 75, status: "cancelada", cantidad: 1, productIndex: 1 },
  { daysAgo: 130, status: "completada", cantidad: 3, productIndex: 2 },
  { daysAgo: 210, status: "pendiente", cantidad: 2, productIndex: 3 },
  { daysAgo: 320, status: "completada", cantidad: 5, productIndex: 4 },
];

async function main() {
  const producer = await resolveProducer();
  if (!producer) {
    throw new Error(`No se encontró un productor objetivo para ${TARGET_PRODUCER_NAME}`);
  }

  const stores = await prisma.tiendas.findMany({
    where: { id_productor: producer.id_productor, eliminado_en: null, nombre: { in: TARGET_STORE_NAMES } },
  });

  if (stores.length < 2) {
    throw new Error("No se encontraron las dos tiendas requeridas para el seeder");
  }

  const customer = await prisma.usuarios.findFirst({
    where: {
      eliminado_en: null,
      NOT: { id_usuario: producer.id_usuario },
    },
    select: { id_usuario: true },
  });

  const customerId = customer?.id_usuario || producer.id_usuario;

  const existingSeedOrders = await prisma.pedidos.findMany({
    where: {
      direccion_envio_snapshot: { not: null },
      eliminado_en: null,
    },
    include: { detalle_pedido: true },
  });

  const alreadySeeded = existingSeedOrders.some((order) => {
    const snapshot = order.direccion_envio_snapshot;
    return snapshot && typeof snapshot === "object" && snapshot.seed === SEED_MARKER;
  });

  const products = [];
  for (const productDef of PRODUCTS) {
    const store = stores.find((item) => item.nombre === productDef.store);
    if (!store) continue;

    const existing = await prisma.productos.findFirst({
      where: {
        nombre: productDef.nombre,
        id_tienda: store.id_tienda,
        eliminado_en: null,
      },
    });

    const payload = {
      id_tienda: store.id_tienda,
      nombre: productDef.nombre,
      descripcion: `Producto semilla para analíticas del dashboard de ${producer.usuarios?.nombre || "Carlos"}`,
      precio_base: productDef.precio_base,
      moneda_base: "MXN",
      status: "activo",
      creado_por: producer.id_usuario,
      actualizado_por: producer.id_usuario,
      metadata: { seed: SEED_MARKER, productor: producer.id_productor },
    };

    const saved = existing
      ? await prisma.productos.update({ where: { id_producto: existing.id_producto }, data: payload })
      : await prisma.productos.create({ data: payload });

    products.push(saved);
  }

  if (!alreadySeeded) {
    for (const sale of SALES_SCHEDULE) {
      const product = products[sale.productIndex];
      if (!product) continue;

      const saleDate = daysAgoDate(sale.daysAgo);
      const total = Number(product.precio_base) * sale.cantidad;

      const order = await prisma.pedidos.create({
        data: {
          id_usuario: customerId,
          estado: sale.status,
          total,
          moneda: "MXN",
          moneda_referencia: "MXN",
          fecha_creacion: saleDate,
          actualizado_en: saleDate,
          direccion_envio_snapshot: {
            seed: SEED_MARKER,
            producer_id: producer.id_productor,
            periodo: sale.daysAgo <= 7 ? "semana" : sale.daysAgo <= 30 ? "mes" : "año",
          },
          direccion_facturacion_snapshot: {
            seed: SEED_MARKER,
          },
        },
      });

      await prisma.detalle_pedido.create({
        data: {
          id_pedido: order.id_pedido,
          id_producto: product.id_producto,
          cantidad: sale.cantidad,
          precio_compra: Number(product.precio_base),
          moneda_compra: "MXN",
          impuesto: 0,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        producerId: producer.id_productor,
        storeIds: stores.map((store) => store.id_tienda),
        productsSeeded: products.map((product) => ({ id: product.id_producto.toString(), nombre: product.nombre, store: product.id_tienda })),
        seededOrders: alreadySeeded ? "already seeded" : SALES_SCHEDULE.length,
      },
      null,
      2,
    ),
  );
}

async function resolveProducer() {
  const productores = await prisma.productores.findMany({
    where: { eliminado_en: null },
    include: { usuarios: true, tiendas: true },
  });

  return productores.find((producer) => {
    const fullName = `${producer.usuarios?.nombre || ""} ${producer.usuarios?.apellido_paterno || ""} ${producer.usuarios?.apellido_materno || ""}`
      .toLowerCase()
      .trim();
    const hasCarlos = fullName.includes(TARGET_PRODUCER_NAME.toLowerCase()) || String(producer.usuarios?.email || "").toLowerCase().includes("mezcal.com");
    const storeNames = producer.tiendas.map((store) => store.nombre);
    const hasTargetStores = TARGET_STORE_NAMES.every((name) => storeNames.includes(name));
    return hasCarlos && hasTargetStores;
  });
}

function daysAgoDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return date;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

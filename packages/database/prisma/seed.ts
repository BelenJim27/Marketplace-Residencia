const { Client } = require("pg");

const SEED_MARKER = "ventas-prueba-lote-maestro";
const LOTE_CODE = "LOTE-MAESTRO-01";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const lote = await client.query(
      `
        SELECT id_lote, id_productor, codigo_lote
        FROM lotes
        WHERE codigo_lote = $1 AND eliminado_en IS NULL
        LIMIT 1
      `,
      [LOTE_CODE],
    );

    if (!lote.rows[0]) {
      throw new Error(`No se encontró el lote ${LOTE_CODE}.`);
    }

    const loteRow = lote.rows[0];

    const productor = await client.query(
      `
        SELECT id_productor, id_usuario
        FROM productores
        WHERE id_productor = $1 AND eliminado_en IS NULL
        LIMIT 1
      `,
      [loteRow.id_productor],
    );

    if (!productor.rows[0]) {
      throw new Error("No se encontró el productor del lote maestro.");
    }

    const productorRow = productor.rows[0];
    const tiendas = await ensureStores(client, productorRow.id_productor);
    const clienteId = await ensureCustomer(client, productorRow.id_usuario);
    const productos = await ensureProducts(client, loteRow.id_lote, productorRow.id_usuario, tiendas);

    const seededOrders = await client.query(
      `
        SELECT id_pedido
        FROM pedidos
        WHERE eliminado_en IS NULL
          AND direccion_envio_snapshot->>'seed' = $1
      `,
      [SEED_MARKER],
    );

    if (seededOrders.rows.length) {
      await client.query(
        `DELETE FROM pedidos WHERE id_pedido = ANY($1::bigint[])`,
        [seededOrders.rows.map((row: { id_pedido: string }) => row.id_pedido)],
      );
    }

    const ventas = [
      {
        producto: productos[0],
        estado: "completada",
        cantidad: 6,
        fecha: daysAgo(2),
      },
      {
        producto: productos[1],
        estado: "pendiente",
        cantidad: 4,
        fecha: daysAgo(1),
      },
    ];

    await syncSequence(client, "pedidos", "id_pedido");
    await syncSequence(client, "detalle_pedido", "id_detalle");

    for (const venta of ventas) {
      const total = Number(venta.producto.precio_base) * venta.cantidad;

      const pedido = await client.query(
        `
          INSERT INTO pedidos (
            id_usuario,
            estado,
            total,
            moneda,
            moneda_referencia,
            fecha_creacion,
            actualizado_en,
            direccion_envio_snapshot,
            direccion_facturacion_snapshot
          )
          VALUES ($1, $2, $3, 'MXN', 'MXN', $4, $4, $5::jsonb, $6::jsonb)
          RETURNING id_pedido
        `,
        [
          clienteId,
          venta.estado,
          total,
          venta.fecha,
          JSON.stringify({ seed: SEED_MARKER, lote: LOTE_CODE, producto: venta.producto.nombre }),
          JSON.stringify({ seed: SEED_MARKER }),
        ],
      );

      await client.query(
        `
          INSERT INTO detalle_pedido (
            id_pedido,
            id_producto,
            cantidad,
            precio_compra,
            moneda_compra,
            impuesto
          )
          VALUES ($1, $2, $3, $4, 'MXN', 0)
        `,
        [pedido.rows[0].id_pedido, venta.producto.id_producto, venta.cantidad, venta.producto.precio_base],
      );
    }

    console.log(
      JSON.stringify(
        {
          lote: loteRow.codigo_lote,
          productor: productorRow.id_productor,
          tiendas,
          productos,
          ventasInsertadas: ventas.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

async function ensureStores(client: any, idProductor: number) {
  const storeNames = ["Casa Mezcal Matatlán", "Mercado del Agave Oaxaca"];
  const stores: Array<{ id_tienda: number; nombre: string }> = [];

  await syncSequence(client, "tiendas", "id_tienda");

  for (const storeName of storeNames) {
    const existing = await client.query(
      `
        SELECT id_tienda, nombre
        FROM tiendas
        WHERE id_productor = $1 AND nombre = $2 AND eliminado_en IS NULL
        LIMIT 1
      `,
      [idProductor, storeName],
    );

    if (existing.rows[0]) {
      stores.push(existing.rows[0]);
      continue;
    }

    const created = await client.query(
      `
        INSERT INTO tiendas (id_productor, nombre, descripcion, pais_operacion, status)
        VALUES ($1, $2, $3, 'MX', 'activa')
        RETURNING id_tienda, nombre
      `,
      [idProductor, storeName, `Tienda semilla para ventas de ${LOTE_CODE}`],
    );

    stores.push(created.rows[0]);
  }

  return stores;
}

async function ensureCustomer(client: any, producerUserId: string) {
  const existing = await client.query(
    `
      SELECT id_usuario
      FROM usuarios
      WHERE eliminado_en IS NULL AND id_usuario <> $1
      ORDER BY fecha_registro ASC
      LIMIT 1
    `,
    [producerUserId],
  );

  if (existing.rows[0]) {
    return existing.rows[0].id_usuario;
  }

  const created = await client.query(
    `
      INSERT INTO usuarios (nombre, apellido_paterno, email, idioma_preferido, moneda_preferida)
      VALUES ($1, $2, $3, 'es', 'MXN')
      RETURNING id_usuario
    `,
    ["Cliente", "Prueba", `cliente.seed.${Date.now()}@mezcal.test`],
  );

  return created.rows[0].id_usuario;
}

async function ensureProducts(
  client: any,
  idLote: number,
  producerUserId: string,
  stores: Array<{ id_tienda: number; nombre: string }>,
) {
  const definitions = [
    {
      id_tienda: stores[0].id_tienda,
      nombre: "Mezcal Lote Maestro Joven",
      descripcion: "Mezcal artesanal del lote maestro con 500L y origen en Santiago Matatlán.",
      precio_base: 780,
    },
    {
      id_tienda: stores[1].id_tienda,
      nombre: "Mezcal Lote Maestro Edición Tienda",
      descripcion: "Edición para pruebas comerciales basada en el lote maestro de abril 2026.",
      precio_base: 845,
    },
  ];

  const products: Array<{ id_producto: string; nombre: string; precio_base: number; id_tienda: number }> = [];

  await syncSequence(client, "productos", "id_producto");

  for (const definition of definitions) {
    const existing = await client.query(
      `
        SELECT id_producto, nombre, precio_base, id_tienda
        FROM productos
        WHERE id_tienda = $1 AND id_lote = $2 AND nombre = $3 AND eliminado_en IS NULL
        LIMIT 1
      `,
      [definition.id_tienda, idLote, definition.nombre],
    );

    if (existing.rows[0]) {
      products.push({
        ...existing.rows[0],
        precio_base: Number(existing.rows[0].precio_base),
      });
      continue;
    }

    const created = await client.query(
      `
        INSERT INTO productos (
          id_tienda,
          id_lote,
          nombre,
          descripcion,
          precio_base,
          moneda_base,
          metadata,
          status,
          creado_por,
          actualizado_por
        )
        VALUES ($1, $2, $3, $4, $5, 'MXN', $6::jsonb, 'activo', $7, $7)
        RETURNING id_producto, nombre, precio_base, id_tienda
      `,
      [
        definition.id_tienda,
        idLote,
        definition.nombre,
        definition.descripcion,
        definition.precio_base,
        JSON.stringify({ seed: SEED_MARKER, lote: LOTE_CODE }),
        producerUserId,
      ],
    );

    products.push({
      ...created.rows[0],
      precio_base: Number(created.rows[0].precio_base),
    });
  }

  return products;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function syncSequence(client: any, tableName: string, columnName: string) {
  await client.query(
    `
      SELECT setval(
        pg_get_serial_sequence($1, $2),
        COALESCE((SELECT MAX(${columnName}) FROM ${tableName}), 1),
        true
      )
    `,
    [tableName, columnName],
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

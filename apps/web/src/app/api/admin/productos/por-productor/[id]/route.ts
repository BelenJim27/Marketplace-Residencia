import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const { id } = await params;
  const idProductor = Number(id);

  if (Number.isNaN(idProductor)) {
    return NextResponse.json(
      { message: "El identificador del productor no es válido." },
      { status: 400 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { message: "DATABASE_URL no está configurada." },
      { status: 500 },
    );
  }

  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(
      `
        SELECT p.id_producto, p.nombre, p.precio_base, p.moneda_base,
               p.status, p.imagen_principal_url,
               COALESCE(i.stock, 0) AS stock
        FROM productos p
        INNER JOIN lotes l ON p.id_lote = l.id_lote
        LEFT JOIN inventario i ON i.id_producto = p.id_producto
        WHERE l.id_productor = $1
          AND p.eliminado_en IS NULL
      `,
      [idProductor],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("ERROR EN API PRODUCTOS:", {
      route: "/api/admin/productos/por-productor/[id]",
      idProductor,
      error,
    });
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  } finally {
    await client.end();
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idProductorParam = searchParams.get("id_productor");

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

    if (idProductorParam) {
      const idProductor = Number(idProductorParam);

      if (Number.isNaN(idProductor)) {
        return NextResponse.json(
          { message: "El identificador del productor no es válido." },
          { status: 400 },
        );
      }

      const result = await client.query(
        `
          SELECT
            id_lote,
            id_productor,
            id_region,
            codigo_lote,
            sitio,
            fecha_produccion,
            volumen_total,
            estado_lote,
            grado_alcohol,
            unidades,
            nombre_comun,
            nombre_cientifico,
            datos_api->>'variedad' AS variedad,
            datos_api,
            creado_en,
            actualizado_en,
            eliminado_en
          FROM lotes
          WHERE id_productor = $1
          ORDER BY creado_en DESC
        `,
        [idProductor],
      );

      return NextResponse.json(result.rows);
    }

    const result = await client.query(
      `
        SELECT
          id_lote,
          id_productor,
          id_region,
          codigo_lote,
          sitio,
          fecha_produccion,
          volumen_total,
          estado_lote,
          grado_alcohol,
          unidades,
          nombre_comun,
          nombre_cientifico,
          datos_api->>'variedad' AS variedad,
          datos_api,
          creado_en,
          actualizado_en,
          eliminado_en
        FROM lotes
        ORDER BY creado_en DESC
      `,
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error cargando lotes:", error);
    return NextResponse.json(
      { message: "No fue posible obtener los lotes." },
      { status: 500 },
    );
  } finally {
    await client.end();
  }
}

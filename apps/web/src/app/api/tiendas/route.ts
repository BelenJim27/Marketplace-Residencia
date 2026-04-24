import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_productor = searchParams.get("id_productor");

    if (!id_productor) {
      return NextResponse.json(
        { message: "Se requiere el parámetro id_productor" },
        { status: 400 },
      );
    }

    const idProductorNum = Number(id_productor);
    if (Number.isNaN(idProductorNum)) {
      return NextResponse.json(
        { message: "El identificador del productor no es válido." },
        { status: 400 },
      );
    }

    const tiendas = await prisma.tiendas.findMany({
      where: {
        id_productor: idProductorNum,
        eliminado_en: null,
      },
      select: {
        id_tienda: true,
        nombre: true,
      },
    });

    // Transformar los datos al formato esperado por el frontend
    const transformed = tiendas.map((tienda) => ({
      id: tienda.id_tienda.toString(),
      nombre: tienda.nombre,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error cargando tiendas:", error);
    return NextResponse.json(
      { message: "No fue posible obtener las tiendas." },
      { status: 500 },
    );
  }
}

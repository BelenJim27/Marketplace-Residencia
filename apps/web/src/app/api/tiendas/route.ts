import { NextResponse } from "next/server";

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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${API_URL}/tiendas?id_productor=${idProductorNum}`);

    if (!response.ok) {
      throw new Error(`NestJS API error: ${response.status}`);
    }

    const tiendas = await response.json();

    const transformed = tiendas.map((tienda: any) => ({
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

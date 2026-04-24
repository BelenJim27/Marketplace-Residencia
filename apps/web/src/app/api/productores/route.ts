import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${API_URL}/productores`);

    if (!response.ok) {
      throw new Error(`NestJS API error: ${response.status}`);
    }

    const productores = await response.json();

    const transformed = productores.map((prod: any) => ({
      id: prod.id_productor.toString(),
      nombre: prod.usuarios.nombre,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error cargando productores:", error);
    return NextResponse.json(
      { message: "No fue posible obtener los productores." },
      { status: 500 },
    );
  }
}

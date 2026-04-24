import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const idProductor = Number(id);

  if (Number.isNaN(idProductor)) {
    return NextResponse.json(
      { message: "El identificador del productor no es válido." },
      { status: 400 },
    );
  }

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${API_URL}/productores/${idProductor}`);

    if (response.status === 404) {
      return NextResponse.json(
        { message: "Productor no encontrado." },
        { status: 404 },
      );
    }

    if (!response.ok) {
      throw new Error(`NestJS API error: ${response.status}`);
    }

    const productor = await response.json();
    return NextResponse.json(productor);
  } catch (error) {
    console.error("Error cargando productor:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}

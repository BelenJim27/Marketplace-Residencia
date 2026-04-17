import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const productor = await prisma.productores.findFirst({
      where: {
        id_productor: idProductor,
        eliminado_en: null,
      },
      select: {
        id_productor: true,
        id_usuario: true,
        biografia: true,
      },
    });

    if (!productor) {
      return NextResponse.json(
        { message: "Productor no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(productor);
  } catch (error) {
    console.error("Error cargando productor:", error);
    return NextResponse.json(
      { message: "No fue posible obtener el productor." },
      { status: 500 },
    );
  }
}

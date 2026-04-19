import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("Iniciando carga de productores...");
    
    const productores = await prisma.productores.findMany({
      where: {
        eliminado_en: null,
      },
      include: {
        usuarios: {
          select: {
            nombre: true,
          },
        },
      },
    });

    console.log(`Se encontraron ${productores.length} productores`);

    // Transformar los datos al formato esperado por el frontend
    const transformed = productores.map((prod) => ({
      id: prod.id_productor.toString(),
      nombre: prod.usuarios.nombre,
    }));

    console.log("Productores transformados:", transformed);

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error cargando productores:", error);
    return NextResponse.json(
      { message: "No fue posible obtener los productores.", error: String(error) },
      { status: 500 },
    );
  }
}

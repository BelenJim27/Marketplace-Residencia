import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const id_producto = BigInt(id);

    const body = await request.json();
    const {
      nombre_producto,
      stock,
      status = "ACTIVO",
    } = body;

    // Actualizar producto
    await prisma.productos.update({
      where: { id_producto },
      data: {
        nombre: nombre_producto,
        status: status.toLowerCase(),
      },
    });

    // Actualizar inventario
    const inventario = await prisma.inventario.findFirst({
      where: { id_producto },
    });

    if (inventario) {
      await prisma.inventario.update({
        where: { id_inventario: inventario.id_inventario },
        data: { stock: Number(stock) || 0 },
      });
    } else {
      await prisma.inventario.create({
        data: {
          id_producto,
          stock: Number(stock) || 0,
        },
      });
    }

    return NextResponse.json({
      message: "Producto actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error actualizando producto:", error);
    return NextResponse.json(
      { message: "Error al actualizar el producto" },
      { status: 500 },
    );
  }
}

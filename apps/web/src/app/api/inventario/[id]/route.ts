import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // Actualizar producto en NestJS
    const productoResponse = await fetch(`${API_URL}/productos/${id_producto.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre_producto,
        status: status.toLowerCase(),
      }),
    });

    if (!productoResponse.ok) {
      throw new Error(`Error actualizando producto: ${productoResponse.status}`);
    }

    // Obtener inventario para este producto
    const inventarioListResponse = await fetch(
      `${API_URL}/inventario/producto/${id_producto.toString()}`
    );

    let inventarioId: string | null = null;
    if (inventarioListResponse.ok) {
      const inventario = await inventarioListResponse.json();
      if (inventario) {
        inventarioId = inventario.id_inventario?.toString() || null;
      }
    }

    // Actualizar o crear inventario
    if (inventarioId) {
      await fetch(`${API_URL}/inventario/${inventarioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: Number(stock) || 0,
        }),
      });
    } else {
      await fetch(`${API_URL}/inventario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_producto: id_producto.toString(),
          stock: Number(stock) || 0,
        }),
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

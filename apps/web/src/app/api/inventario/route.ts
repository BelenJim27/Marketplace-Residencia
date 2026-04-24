import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${API_URL}/inventario/dashboard`);

    if (!response.ok) {
      throw new Error(`NestJS API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error cargando inventario:", error);
    return NextResponse.json(
      { message: "No fue posible obtener el inventario." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nombre_producto,
      id_tienda,
      stock,
      status = "ACTIVO",
    } = body;

    if (!nombre_producto || !id_tienda) {
      return NextResponse.json(
        { message: "Faltan campos requeridos" },
        { status: 400 },
      );
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    // Crear producto en NestJS
    const productoResponse = await fetch(`${API_URL}/productos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre_producto,
        id_tienda: Number(id_tienda),
        status: status.toLowerCase(),
        precio_base: "0",
      }),
    });

    if (!productoResponse.ok) {
      throw new Error(`Error creando producto: ${productoResponse.status}`);
    }

    const producto = await productoResponse.json();

    // Crear inventario en NestJS
    const inventarioResponse = await fetch(`${API_URL}/inventario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_producto: producto.id_producto,
        stock: Number(stock) || 0,
      }),
    });

    if (!inventarioResponse.ok) {
      throw new Error(`Error creando inventario: ${inventarioResponse.status}`);
    }

    return NextResponse.json(
      {
        message: "Producto creado exitosamente",
        id_producto: producto.id_producto.toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creando producto:", error);
    return NextResponse.json(
      { message: "Error al crear el producto" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Obtener todos los productos con inventario, tienda y productor
    const productos = await prisma.productos.findMany({
      where: {
        eliminado_en: null,
      },
      include: {
        inventario: true,
        tiendas: {
          include: {
            productores: {
              include: {
                usuarios: {
                  select: {
                    nombre: true,
                  },
                },
                regiones: {
                  select: {
                    nombre: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const items = productos.map((prod) => {
      const inv = prod.inventario[0]; // Generalmente hay un inventario por producto
      const productor = prod.tiendas.productores;
      return {
        id_producto: prod.id_producto.toString(),
        nombre_producto: prod.nombre,
        productor: productor.usuarios.nombre,
        region: productor.regiones?.nombre || "N/A",
        stock: inv?.stock || 0,
        status: prod.status?.toUpperCase() || "ACTIVO",
        imagen: prod.imagen_principal_url,
      };
    });

    // Calcular resumen
    const productosActivos = items.filter((item) => item.status === "ACTIVO").length;
    const productosInactivos = items.filter((item) => item.status === "INACTIVO").length;

    // Obtener total de productores únicos
    const productoresUnicos = await prisma.productores.findMany({
      where: {
        eliminado_en: null,
      },
      select: {
        id_productor: true,
      },
    });

    const summary = {
      productos_activos: productosActivos,
      productos_inactivos: productosInactivos,
      total_productos: items.length,
      total_productores: productoresUnicos.length,
    };

    return NextResponse.json({
      summary,
      items,
    });
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

    // Crear producto
    const producto = await prisma.productos.create({
      data: {
        nombre: nombre_producto,
        id_tienda: Number(id_tienda),
        status: status.toLowerCase(),
        precio_base: 0,
      },
    });

    // Crear inventario
    await prisma.inventario.create({
      data: {
        id_producto: producto.id_producto,
        stock: Number(stock) || 0,
      },
    });

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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeStatus(status?: string | null) {
  const normalized = String(status || "inactivo")
    .trim()
    .toLowerCase();
  if (normalized === "activo") return "ACTIVO";
  if (normalized === "inactivo") return "INACTIVO";
  return normalized.toUpperCase();
}

function formatProductorName(
  productor?: {
    usuarios?: {
      nombre: string;
      apellido_paterno: string | null;
      apellido_materno: string | null;
    } | null;
  } | null,
) {
  if (!productor?.usuarios) return "Sin productor";

  return [
    productor.usuarios.nombre,
    productor.usuarios.apellido_paterno,
    productor.usuarios.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function GET() {
  try {
    const [
      productosActivos,
      productosInactivos,
      totalProductos,
      totalProductores,
      productos,
    ] = await Promise.all([
      prisma.productos.count({
        where: {
          eliminado_en: null,
          status: { equals: "activo", mode: "insensitive" },
        },
      }),
      prisma.productos.count({
        where: {
          eliminado_en: null,
          status: { equals: "inactivo", mode: "insensitive" },
        },
      }),
      prisma.productos.count({ where: { eliminado_en: null } }),
      prisma.productores.count({ where: { eliminado_en: null } }),
      prisma.productos.findMany({
        where: { eliminado_en: null },
        orderBy: { id_producto: "desc" },
        include: {
          inventario: { select: { stock: true } },
          lotes: {
            include: {
              productores: {
                include: {
                  usuarios: {
                    select: {
                      nombre: true,
                      apellido_paterno: true,
                      apellido_materno: true,
                    },
                  },
                  regiones: { select: { nombre: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const items = productos.map((producto) => {
      const productor = producto.lotes?.productores;

      return {
        id_producto: producto.id_producto.toString(),
        nombre_producto: producto.nombre,
        productor: formatProductorName(productor),
        region: productor?.regiones?.nombre ?? "Sin región",
        stock: producto.inventario.reduce(
          (total, item) => total + Number(item.stock || 0),
          0,
        ),
        status: normalizeStatus(producto.status),
      };
    });

    return NextResponse.json({
      summary: {
        productos_activos: productosActivos,
        productos_inactivos: productosInactivos,
        total_productos: totalProductos,
        total_productores: totalProductores,
      },
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el inventario.",
      },
      { status: 500 },
    );
  }
}

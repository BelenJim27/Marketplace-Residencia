import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ProductorPayload = {
  nombre?: string;
  region?: string;
  stock?: number;
  status?: string;
};

function buildMetadata(stock: number) {
  return JSON.stringify({
    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
  });
}

function serializeProductor(productor: {
  id_productor: number;
  otras_caracteristicas: string | null;
  usuarios: {
    nombre: string;
    apellido_paterno: string | null;
    apellido_materno: string | null;
  };
  regiones: { nombre: string } | null;
  lotes: Array<{
    productos: Array<{ id_producto: bigint }>;
  }>;
}) {
  const totalProductos = productor.lotes.reduce(
    (totalLotes, lote) => totalLotes + lote.productos.length,
    0,
  );

  return {
    id: productor.id_productor,
    nombre: [
      productor.usuarios.nombre,
      productor.usuarios.apellido_paterno,
      productor.usuarios.apellido_materno,
    ]
      .filter(Boolean)
      .join(" ")
      .trim(),
    region: productor.regiones?.nombre ?? "Sin región",
    stock: totalProductos,
    total_productos: totalProductos,
    status: "ACTIVO",
  };
}

async function findOrCreateRegion(region: string) {
  const regionName = region.trim();
  if (!regionName) return null;

  const existing = await prisma.regiones.findFirst({
    where: { nombre: { equals: regionName, mode: "insensitive" } },
    select: { id_region: true },
  });

  if (existing) return existing.id_region;

  const created = await prisma.regiones.create({
    data: { nombre: regionName, pais_iso2: "MX", activo: true },
    select: { id_region: true },
  });

  return created.id_region;
}

function validatePayload(body: ProductorPayload) {
  const nombre = String(body.nombre || "").trim();
  const region = String(body.region || "").trim();
  const stock = Number(body.stock ?? 0);

  if (!nombre || !region) {
    throw new Error("Nombre y región son obligatorios.");
  }

  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error("El stock debe ser un número mayor o igual a 0.");
  }

  return { nombre, region, stock };
}

export async function GET() {
  try {
    const productores = await prisma.productores.findMany({
      where: { eliminado_en: null },
      orderBy: { id_productor: "desc" },
      include: {
        usuarios: {
          select: {
            nombre: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
        regiones: { select: { nombre: true } },
        lotes: {
          where: { eliminado_en: null },
          include: {
            productos: {
              where: { eliminado_en: null },
              select: { id_producto: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      productores
        .map(serializeProductor)
        .sort((a, b) => b.total_productos - a.total_productos),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No fue posible listar productores.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductorPayload;
    const payload = validatePayload(body);
    const regionId = await findOrCreateRegion(payload.region);
    const slug =
      payload.nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "productor";
    const email = `${slug}-${crypto.randomUUID().slice(0, 8)}@marketplace.local`;

    const createdId = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuarios.create({
        data: { nombre: payload.nombre, email },
        select: { id_usuario: true },
      });

      const productor = await tx.productores.create({
        data: {
          id_usuario: usuario.id_usuario,
          id_region: regionId,
          otras_caracteristicas: buildMetadata(payload.stock),
        },
        select: { id_productor: true },
      });

      return productor.id_productor;
    });

    const created = await prisma.productores.findUnique({
      where: { id_productor: createdId },
      include: {
        usuarios: {
          select: {
            nombre: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
        regiones: { select: { nombre: true } },
        lotes: {
          where: { eliminado_en: null },
          include: {
            productos: {
              where: { eliminado_en: null },
              select: { id_producto: true },
            },
          },
        },
      },
    });

    return NextResponse.json(serializeProductor(created!), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No fue posible crear el productor.",
      },
      { status: 400 },
    );
  }
}

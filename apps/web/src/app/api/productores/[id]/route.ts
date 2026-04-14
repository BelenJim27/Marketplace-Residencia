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

async function getSerializedProductor(id: number) {
  const productor = await prisma.productores.findFirst({
    where: { id_productor: id, eliminado_en: null },
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

  if (!productor) throw new Error("Productor no encontrado.");
  return serializeProductor(productor);
}

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getSerializedProductor(Number(id)));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No fue posible obtener el productor.",
      },
      { status: 404 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const productorId = Number(id);
    const body = (await request.json()) as ProductorPayload;
    const payload = validatePayload(body);
    const regionId = await findOrCreateRegion(payload.region);

    const current = await prisma.productores.findFirst({
      where: { id_productor: productorId, eliminado_en: null },
      select: {
        id_usuario: true,
      },
    });

    if (!current) {
      return NextResponse.json(
        { message: "Productor no encontrado." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.productores.update({
        where: { id_productor: productorId },
        data: {
          id_region: regionId,
          otras_caracteristicas: buildMetadata(payload.stock),
        },
      });

      await tx.usuarios.update({
        where: { id_usuario: current.id_usuario },
        data: { nombre: payload.nombre },
      });
    });

    return NextResponse.json(await getSerializedProductor(productorId));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el productor.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const productorId = Number(id);
    const deletedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.productores.update({
        where: { id_productor: productorId },
        data: { eliminado_en: deletedAt },
      });
    });

    return NextResponse.json({ message: "Productor eliminado correctamente." });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No fue posible eliminar el productor.",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  const { id } = await params;
  const idProductor = Number(id);

  if (Number.isNaN(idProductor)) {
    return NextResponse.json(
      { message: "El identificador del productor no es válido." },
      { status: 400 },
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const authHeader = request.headers.get("authorization");

  try {
    const res = await fetch(`${apiUrl}/productos?id_productor=${idProductor}`, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { message: "No fue posible obtener los productos." },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("ERROR EN API PRODUCTOS:", {
      route: "/api/admin/productos/por-productor/[id]",
      idProductor,
      error,
    });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

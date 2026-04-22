import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idProductorParam = searchParams.get("id_productor");

  if (idProductorParam !== null && Number.isNaN(Number(idProductorParam))) {
    return NextResponse.json(
      { message: "El identificador del productor no es válido." },
      { status: 400 },
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const url = idProductorParam
    ? `${apiUrl}/lotes?id_productor=${idProductorParam}`
    : `${apiUrl}/lotes`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { message: "No fue posible obtener los lotes." },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("Error cargando lotes:", error);
    return NextResponse.json(
      { message: "No fue posible obtener los lotes." },
      { status: 500 },
    );
  }
}

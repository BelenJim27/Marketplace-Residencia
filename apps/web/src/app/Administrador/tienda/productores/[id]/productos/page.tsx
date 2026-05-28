"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { ProductosProductor } from "@/components/Administrator/Store/productos-productor";

export default function ProductosProductorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const idProductor = Number(id);
  const router = useRouter();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/Administrador/tienda/productores")}
          className="flex items-center gap-2 rounded-xl border border-[#C5CFB0] px-4 py-2 text-sm font-medium text-[#1F3A2E] transition-all duration-200 hover:bg-[#C5CFB0]/30"
        >
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F3A2E] [font-family:'Playfair_Display',serif]">
            Productos del productor
          </h1>
          <p className="mt-0.5 text-sm text-[#3D6B3F]/70">
            Gestiona los productos registrados para este productor.
          </p>
        </div>
      </div>
      <ProductosProductor idProductor={idProductor} />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function TiendaPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const id = params.id;
    if (!id) { router.replace("/"); return; }

    api.tiendas.getOne(Number(id)).then((tienda: any) => {
      if (tienda?.id_productor) {
        router.replace(`/cliente/productor/${tienda.id_productor}`);
      } else {
        router.replace("/");
      }
    }).catch(() => router.replace("/"));
  }, [params.id, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center" style={{ backgroundColor: "#F4F0E3" }}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#ddd8c4] border-t-[#306B3F]" />
        <p className="text-sm" style={{ color: "#A8C26B" }}>Cargando...</p>
      </div>
    </div>
  );
}

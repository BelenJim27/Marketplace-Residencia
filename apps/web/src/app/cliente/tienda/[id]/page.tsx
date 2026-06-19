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
    <div className="flex min-h-[60vh] items-center justify-center bg-[#F4F0E3] dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#ddd8c4] dark:border-gray-600 border-t-[#306B3F] dark:border-t-amber-500" />
        <p className="text-sm text-[#A8C26B] dark:text-amber-400">Cargando...</p>
      </div>
    </div>
  );
}

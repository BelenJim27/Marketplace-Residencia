"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function Configuracion() {
  return (
    <>
      <Breadcrumb pageName="Configuración" />
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card p-7.5">
        <h2 className="text-title-md2 font-bold text-black dark:text-white mb-4">
          Configuración del Sistema
        </h2>
      </div>
    </>
  );
}

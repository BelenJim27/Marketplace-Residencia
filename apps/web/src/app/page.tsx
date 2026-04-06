import { Metadata } from "next";
import { ProductosGrid } from "@/components/Administrador/Tienda/productos-grid";

export const metadata: Metadata = {
  title: "Tienda - Productos",
};

export default function TiendaPage() {
  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
        Nuestros Productos
      </h1>

      <ProductosGrid />
    </main>
  );
}

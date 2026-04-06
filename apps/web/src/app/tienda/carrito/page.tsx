import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carrito de Compras",
};

export default function CarritoPage() {
  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-dark dark:text-white">
        Carrito de Compras
      </h1>

      <div className="rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-dark">
        <p className="text-gray-500">Tu carrito está vacío</p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ProductosProductor } from "@/components/Administrador/Tienda/productos-productor";

type ProductosProductorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductosProductorPage({
  params,
}: ProductosProductorPageProps) {
  const { id } = await params;
  const productorId = Number(id);

  if (Number.isNaN(productorId)) {
    return (
      <div className="space-y-4 p-6">
        <Link
          href="/dashboard/admin/productores"
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-gray-50"
        >
          ← Regresar
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          El identificador del productor no es válido.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/admin/productores"
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-gray-50"
        >
          ← Regresar
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Productos del Productor #{productorId}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Consulta y administra los productos registrados para este productor.
          </p>
        </div>
      </div>

      <ProductosProductor idProductor={productorId} />
    </div>
  );
}

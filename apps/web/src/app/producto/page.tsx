import { Metadata } from "next";
import ProductCatalogPublic from "@/components/catalog/Public";

export const metadata: Metadata = {
  title: {
    absolute: "Productos",
  },
};

export default function ProductoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Nuestros Productos
          </h1>
          <p className="text-gray-500">
            Descubre los mejores productos frescos
          </p>
        </div>
      </div>

      <ProductCatalogPublic />
    </div>
  );
}


import { StoreEditForm } from "@/components/Producer/Store/StoreEditForm";

export const metadata = {
  title: "Editar Tienda | Productor",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-1 px-4 py-8 dark:bg-dark sm:px-8">
      <StoreEditForm />
    </div>
  );
}

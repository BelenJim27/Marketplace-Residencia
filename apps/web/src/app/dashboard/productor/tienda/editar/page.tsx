import { StoreEditForm } from "@/components/Producer/Store/StoreEditForm";
import { PermissionGate } from "@/components/auth/PermissionGate";

export const metadata = {
  title: "Editar Tienda | Productor",
};

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["editar_tienda", "editar_perfil_productor"]}>
      <StoreEditForm />
    </PermissionGate>
  );
}

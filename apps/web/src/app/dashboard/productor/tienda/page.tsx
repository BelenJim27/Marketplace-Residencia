import { TiendasPage } from "@/components/Producer/Store/TiendasPage";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["ver_tienda", "crear_tienda", "editar_tienda", "editar_perfil_productor"]}>
      <TiendasPage />
    </PermissionGate>
  );
}


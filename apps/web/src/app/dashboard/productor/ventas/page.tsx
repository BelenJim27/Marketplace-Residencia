import VentasPage from "@/components/Producer/VentasPage";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["ver_reportes_productor"]}>
      <VentasPage />
    </PermissionGate>
  );
}


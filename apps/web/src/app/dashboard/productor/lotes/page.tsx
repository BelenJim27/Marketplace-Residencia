import LotesView from "@/components/Producer/Lots/LotesView";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["ver_inventario", "crear_inventario", "editar_inventario"]}>
      <LotesView />
    </PermissionGate>
  );
}


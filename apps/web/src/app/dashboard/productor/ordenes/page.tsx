import OrdenesView from "@/components/Producer/Lots/ordenesview";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["ver_pedidos", "editar_pedido"]}>
      <OrdenesView />
    </PermissionGate>
  );
}

import InventarioUI from '@/components/Administrator/Inventory/inventario';
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["gestionar_inventario"]}>
      <InventarioUI />
    </PermissionGate>
  );
}

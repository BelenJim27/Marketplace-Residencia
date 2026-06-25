import Pedidos from '@/components/Administrator/Orders/pedidos';
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["gestionar_pedidos"]}>
      <Pedidos />
    </PermissionGate>
  );
}

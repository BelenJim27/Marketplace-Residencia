import ProductosAdmin from '@/components/Administrator/Products/productos';
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["gestionar_productos"]}>
      <ProductosAdmin />
    </PermissionGate>
  );
}

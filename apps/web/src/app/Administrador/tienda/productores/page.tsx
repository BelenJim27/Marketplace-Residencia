import { ProductoresTabla } from "@/components/Administrator/Store/productores-tabla";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function ProductoresAdminPage() {
  return (
    <PermissionGate requiredPermissions={["gestionar_productores"]}>
      <ProductoresTabla />
    </PermissionGate>
  );
}


import {ProductorDashboard} from "@/components/Producer/dashboard/ProductorDashboard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { requireAccess } from "@/lib/server-access";
import { PERMISOS } from "@/lib/permisos-catalog";

export default async function Page() {
  await requireAccess({
    anyOf: [PERMISOS.VER_REPORTES_PRODUCTOR],
    requireProductor: true,
    redirectPath: "/dashboard/productor",
  });
  return (
    <PermissionGate requiredPermissions={[PERMISOS.VER_REPORTES_PRODUCTOR]}>
      <ProductorDashboard />
    </PermissionGate>
  );
}


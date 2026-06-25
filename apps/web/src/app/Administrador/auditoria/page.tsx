import AuditoriaUI from "@/components/Administrator/Audit/auditoria";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["ver_auditoria"]}>
      <AuditoriaUI />
    </PermissionGate>
  );
}

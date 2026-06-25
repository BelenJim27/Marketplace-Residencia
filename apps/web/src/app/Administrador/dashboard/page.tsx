import { AdminDashboard } from "@/components/Administrator/dashboard/AdminDashboard";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function AdminDashboardPage() {
  return (
    <PermissionGate requiredPermissions={["ver_reportes"]}>
      <AdminDashboard />
    </PermissionGate>
  );
}

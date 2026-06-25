import ArchivosView from "@/components/Producer/Files/ArchivosView";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["gestionar_archivos"]}>
      <ArchivosView />
    </PermissionGate>
  );
}


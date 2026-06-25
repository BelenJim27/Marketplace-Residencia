import UsuariosUI from '@/components/Administrator/Users/usuarios';
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function Page() {
  return (
    <PermissionGate requiredPermissions={["gestionar_usuarios"]}>
      <UsuariosUI />
    </PermissionGate>
  );
}


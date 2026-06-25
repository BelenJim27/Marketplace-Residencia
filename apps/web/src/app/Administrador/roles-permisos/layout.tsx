import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';
import { PERMISOS } from '@/lib/permisos-catalog';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout anyOf={[PERMISOS.GESTIONAR_ROLES_PERMISOS]} redirectPath="/Administrador/roles-permisos">{children}</ServerPermissionLayout>;
}

import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';
import { PERMISOS } from '@/lib/permisos-catalog';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout anyOf={[PERMISOS.VER_REPORTES_PRODUCTOR]} requireProductor redirectPath="/dashboard/productor/ventas">{children}</ServerPermissionLayout>;
}

import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';
import { PERMISOS } from '@/lib/permisos-catalog';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout anyOf={[PERMISOS.VER_INVENTARIO, PERMISOS.CREAR_INVENTARIO, PERMISOS.EDITAR_INVENTARIO]} requireProductor redirectPath="/dashboard/productor/lotes">{children}</ServerPermissionLayout>;
}

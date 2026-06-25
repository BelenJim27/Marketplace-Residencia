import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';
import { PERMISOS } from '@/lib/permisos-catalog';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout anyOf={[PERMISOS.VER_TIENDA, PERMISOS.CREAR_TIENDA, PERMISOS.EDITAR_TIENDA, PERMISOS.EDITAR_PERFIL_PRODUCTOR]} requireProductor redirectPath="/dashboard/productor/tienda">{children}</ServerPermissionLayout>;
}

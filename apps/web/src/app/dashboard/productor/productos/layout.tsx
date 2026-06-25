import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';
import { PERMISOS } from '@/lib/permisos-catalog';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout anyOf={[PERMISOS.VER_PRODUCTOS, PERMISOS.CREAR_PRODUCTO, PERMISOS.EDITAR_PRODUCTO, PERMISOS.ELIMINAR_PRODUCTO]} requireProductor redirectPath="/dashboard/productor/productos">{children}</ServerPermissionLayout>;
}

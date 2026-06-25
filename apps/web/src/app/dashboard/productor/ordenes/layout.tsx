import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';
import { PERMISOS } from '@/lib/permisos-catalog';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout anyOf={[PERMISOS.VER_PEDIDOS, PERMISOS.EDITAR_PEDIDO]} requireProductor redirectPath="/dashboard/productor/ordenes">{children}</ServerPermissionLayout>;
}

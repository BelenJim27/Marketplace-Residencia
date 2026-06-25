import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';
import { PERMISOS } from '@/lib/permisos-catalog';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout allOf={[PERMISOS.CREAR_PEDIDO, PERMISOS.PAGAR]} redirectPath="/tienda/checkout">{children}</ServerPermissionLayout>;
}

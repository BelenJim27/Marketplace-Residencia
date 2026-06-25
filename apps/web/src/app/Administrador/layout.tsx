import { ADMIN_PERMISOS } from '@/lib/permisos-catalog';
import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerPermissionLayout anyOf={ADMIN_PERMISOS} redirectPath="/Administrador">
      {children}
    </ServerPermissionLayout>
  );
}

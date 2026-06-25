import { requireAccess } from '@/lib/server-access';

export async function ServerPermissionLayout({
  children,
  anyOf,
  allOf,
  requireProductor = false,
  redirectPath,
}: {
  children: React.ReactNode;
  anyOf?: readonly string[];
  allOf?: readonly string[];
  requireProductor?: boolean;
  redirectPath: string;
}) {
  await requireAccess({ anyOf, allOf, requireProductor, redirectPath });
  return <>{children}</>;
}

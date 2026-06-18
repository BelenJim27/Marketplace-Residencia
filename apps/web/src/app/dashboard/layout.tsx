import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function decodeJwtRoles(token: string): string[] {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return [];
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(json);
    return Array.isArray(payload?.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const roles = token ? decodeJwtRoles(token) : [];

  if (!roles.includes('productor') && !roles.includes('administrador')) {
    redirect('/auth/sign-in');
  }

  return <>{children}</>;
}

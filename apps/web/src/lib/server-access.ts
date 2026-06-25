import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasAllPermissions, hasAnyPermission } from '@/lib/permisos-catalog';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export interface ServerAccessContext {
  id_usuario: string;
  email: string;
  roles: string[];
  permisos: string[];
  id_productor: number | null;
}

export async function getServerAccessContext(): Promise<
  | { status: 'ok'; context: ServerAccessContext }
  | { status: 'unauthenticated' }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return { status: 'unauthenticated' };

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return { status: 'unauthenticated' };
    const data = await response.json();
    return {
      status: 'ok',
      context: {
        id_usuario: String(data.id_usuario),
        email: String(data.email ?? ''),
        roles: Array.isArray(data.roles) ? data.roles : [],
        permisos: Array.isArray(data.permisos) ? data.permisos : [],
        id_productor: data.id_productor == null ? null : Number(data.id_productor),
      },
    };
  } catch {
    return { status: 'unauthenticated' };
  }
}

export async function requireAccess(options: {
  anyOf?: readonly string[];
  allOf?: readonly string[];
  requireProductor?: boolean;
  redirectPath: string;
}): Promise<ServerAccessContext> {
  const result = await getServerAccessContext();
  if (result.status === 'unauthenticated') {
    redirect(`/auth/session-invalidated?redirect=${encodeURIComponent(options.redirectPath)}`);
  }

  const { context } = result;
  const hasAny = !options.anyOf?.length || hasAnyPermission(context.permisos, options.anyOf);
  const hasAll = !options.allOf?.length || hasAllPermissions(context.permisos, options.allOf);
  const hasProductor = !options.requireProductor || context.id_productor !== null;

  if (!hasAny || !hasAll || !hasProductor) {
    redirect(`/sin-acceso?from=${encodeURIComponent(options.redirectPath)}`);
  }
  return context;
}

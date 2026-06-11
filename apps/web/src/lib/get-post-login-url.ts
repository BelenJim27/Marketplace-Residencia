/**
 * Devuelve la URL de destino correcta después de un login exitoso,
 * según los roles y permisos del usuario.
 */
export function getPostLoginUrl(
  roles: string[],
  permisos: string[],
  options?: { isVenderFlow?: boolean; redirectUrl?: string | null },
): string {
  const { isVenderFlow = false, redirectUrl } = options ?? {};

  if (isVenderFlow) return "/dashboard/productor/solicitar";

  const isAdmin = roles.some((r) => ["ADMIN", "administrador", "admin"].includes(r));
  if (isAdmin) return "/Administrador/dashboard";

  const isProductor =
    permisos.includes("panel_productor") ||
    roles.some((r) => ["PRODUCTOR", "productor"].includes(r));
  if (isProductor) return "/dashboard/productor";

  if (redirectUrl) return redirectUrl;

  return "/cliente/producto";
}

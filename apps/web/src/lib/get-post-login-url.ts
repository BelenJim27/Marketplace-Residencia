import { getFirstAllowedDestination } from "./permisos-catalog";

export function getPostLoginUrl(
  permisos: string[],
  idProductor: number | null | undefined,
  options?: { isVenderFlow?: boolean; redirectUrl?: string | null },
): string {
  const { isVenderFlow = false, redirectUrl } = options ?? {};

  if (isVenderFlow) return "/dashboard/productor/solicitar";

  if (redirectUrl) return redirectUrl;
  return getFirstAllowedDestination(permisos, {
    hasActiveProductor: idProductor != null,
  });
}

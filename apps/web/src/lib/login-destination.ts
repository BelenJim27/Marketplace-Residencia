import { getFirstAllowedDestination } from "./permisos-catalog";

export function getLoginDestination(permisos: string[] | undefined, idProductor: number | null | undefined): string {
  return getFirstAllowedDestination(permisos, {
    hasActiveProductor: idProductor != null,
    fallback: "/cliente/producto",
  });
}

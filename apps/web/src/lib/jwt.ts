// Decodifica el claim `sub` (el `usuarios.id_usuario` real que firma el backend)
// de un JWT de acceso. NO verifica la firma — es solo para que el cliente conozca
// su propio id de forma fiable; la autorización siempre la hace el backend.
//
// Necesario porque el id que expone NextAuth (`session.user.id`) puede caer al
// `sub` del perfil de Google (no es UUID) cuando el intercambio OAuth no rellena
// el id real. El `sub` del access token siempre es el UUID correcto.
export function getUserIdFromToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      decodeURIComponent(
        atob(payloadB64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      ),
    );
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

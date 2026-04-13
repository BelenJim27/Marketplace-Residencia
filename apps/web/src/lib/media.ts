const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

export function getMediaUrl(path?: string | null) {
  if (!path) return "";
  if (/^(https?:\/\/|blob:|data:)/i.test(path)) return path;
  if (path.startsWith("/")) return path;
  return `${API_BASE}/${path.replace(/^\/+/, "")}`;
}

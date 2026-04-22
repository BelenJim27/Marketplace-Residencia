import { NextRequest, NextResponse } from "next/server";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "change-me-access-secret";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (!token) {
    return redirectToSignIn(request);
  }

  try {
    const payload = await verifyJwt(token, ACCESS_SECRET);

    if (payload.token_type !== "access") {
      return redirectToSignIn(request);
    }

    // Rutas que solo requieren estar autenticado
    if (pathname.startsWith("/Productor/solicitar")) {
      return NextResponse.next();
    }

    let requiredPermission = "panel_productor";
    if (pathname.startsWith("/dashboard/administrador")) {
      requiredPermission = "panel_admin";
    }

    const permisos = Array.isArray(payload.permisos) ? payload.permisos : [];
    if (!permisos.includes(requiredPermission)) {
      return redirectToSignIn(request);
    }

    return NextResponse.next();
  } catch {
    return redirectToSignIn(request);
  }
}

export const config = {
  matcher: [
    "/dashboard/productor/:path*",
    "/dashboard/administrador/:path*",
    "/Productor/solicitar",
  ],
};


interface JwtPayload {
  token_type?: string;
  exp?: number;
  permisos?: string[];
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }

  const [header, body, signature] = parts;
  const expected = await sign(`${header}.${body}`, secret);

  if (signature !== expected) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(base64UrlDecode(body)) as JwtPayload;

  if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

function redirectToSignIn(request: NextRequest) {
  const url = new URL("/auth/sign-in", request.url);
  url.searchParams.set("error", "unauthorized");
  return NextResponse.redirect(url);
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie, getCookie } from "@/lib/cookies";
import { useSession } from "next-auth/react";
import { getPostLoginUrl } from "@/lib/get-post-login-url";

export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  useEffect(() => {
    const code = searchParams.get("code");
    // Legado: algunos flujos todavía envían token+refresh directamente (NextAuth interno)
    const tokenDirect = searchParams.get("token");
    const refreshDirect = searchParams.get("refresh");

    if (code) {
      // Flujo seguro: canjear código temporal por tokens (nunca hay tokens en la URL)
      fetch(`/auth/oauth/exchange-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Código OAuth inválido");
          return res.json();
        })
        .then(({ access_token, refresh_token }) => {
          // Backend already set HttpOnly cookies via Set-Cookie on exchange-code response.
          // These setCookie calls are kept for backward compat; for HttpOnly sessions the
          // browser silently ignores them (HttpOnly cannot be overwritten by JS).
          setCookie("token", access_token, 7);
          setCookie("refresh_token", refresh_token, 30);
          return fetch(`/auth/me`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${access_token}` },
          }).then((r) => r.json());
        })
        .then((userData) => {
          if (userData?.id_usuario) {
            setCookie("usuario", JSON.stringify(userData), 7);
          }
          const dest = getPostLoginUrl(
            Array.isArray(userData?.permisos) ? userData.permisos : [],
            userData?.id_productor,
          );
          router.replace(dest);
        })
        .catch(() => {
          router.replace("/auth/login?error=oauth_failed");
        });
    } else if (tokenDirect && refreshDirect) {
      // Flujo legado (solo NextAuth interno) — no viene de Google callback directo
      setCookie("token", tokenDirect, 7);
      setCookie("refresh_token", refreshDirect, 30);

      fetch(`/auth/me`, {
        headers: { Authorization: `Bearer ${tokenDirect}` },
      })
        .then((res) => res.json())
        .then((userData) => {
          if (userData?.id_usuario) {
            setCookie("usuario", JSON.stringify(userData), 7);
          }
          const dest = getPostLoginUrl(
            Array.isArray(userData?.permisos) ? userData.permisos : [],
            userData?.id_productor,
          );
          router.replace(dest);
        })
        .catch(() => {
          router.replace("/cliente/producto");
        });
    } else if (session?.accessToken) {
      const su = session.user as any;
      const dest = getPostLoginUrl(
        Array.isArray(su?.permisos) ? su.permisos : [],
        su?.id_productor,
      );
      router.replace(dest);
    } else {
      const existingToken = getCookie("token");
      router.replace(existingToken ? "/auth/sign-in" : "/auth/sign-in");
    }
  }, [router, searchParams, session]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

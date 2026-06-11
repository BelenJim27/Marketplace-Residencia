"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie, getCookie } from "@/lib/cookies";
import { useSession } from "next-auth/react";
import { getPostLoginUrl } from "@/lib/get-post-login-url";

export const dynamic = 'force-dynamic';
export const prerender = false;

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  useEffect(() => {
    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");

    if (token && refresh) {
      setCookie("token", token, 7);
      setCookie("refresh_token", refresh, 30);

      fetch(`/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((userData) => {
          if (userData?.id_usuario) {
            setCookie("usuario", JSON.stringify(userData), 7);
          }
          const dest = getPostLoginUrl(
            Array.isArray(userData?.roles) ? userData.roles : [],
            Array.isArray(userData?.permisos) ? userData.permisos : [],
          );
          router.replace(dest);
        })
        .catch(() => {
          router.replace("/cliente/producto");
        });
    } else if (session?.accessToken) {
      const su = session.user as any;
      const dest = getPostLoginUrl(
        Array.isArray(su?.roles) ? su.roles : [],
        Array.isArray(su?.permisos) ? su.permisos : [],
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

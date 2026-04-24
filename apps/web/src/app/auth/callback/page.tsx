"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCookie, getCookie } from "@/lib/cookies";
import { useSession } from "next-auth/react";

export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  useEffect(() => {
    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");

    console.log("📍 AuthCallback ejecutado", {
      hasToken: !!token,
      hasRefresh: !!refresh,
      hasSession: !!session,
    });

    if (token && refresh) {
      console.log("✅ Token encontrado en URL, guardando...");
      setCookie("token", token, 7);
      setCookie("refresh_token", refresh, 30);
      
      fetch(`/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((userData) => {
          if (userData && userData.id_usuario) {
            setCookie("usuario", JSON.stringify(userData), 7);
          }
        })
        .catch((err) => console.error("Error fetching user:", err))
        .finally(() => {
          console.log("✅ Redirigiendo a /Cliente/producto");
          router.replace("/Cliente/producto");
        });
    } else if (session?.accessToken) {
      console.log("✅ Sesión encontrada en NextAuth con token");
      router.replace("/Cliente/producto");
    } else {
      const existingToken = getCookie("token");
      if (existingToken) {
        console.log("✅ Token existente encontrado en cookies");
        router.replace("/Cliente/producto");
      } else {
        console.log("❌ No se encontró token ni sesión, redirigiendo a sign-in");
        router.replace("/auth/sign-in");
      }
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

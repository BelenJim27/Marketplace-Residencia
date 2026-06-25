"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SessionInvalidatedPage() {
  useEffect(() => {
    const destination = new URLSearchParams(window.location.search).get("redirect") || "/cliente/producto";
    void signOut({
      callbackUrl: `/auth/sign-in?error=session_invalidated&redirect=${encodeURIComponent(destination)}`,
    });
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#3D6B3F]">
      Actualizando tu sesión…
    </div>
  );
}

"use client";

import { useState } from "react";
import { GoogleIcon } from "@/assets/icons";
import { signIn } from "next-auth/react";

export default function GoogleSigninButton({ text }: { text: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignin = () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔵 Iniciando sesión con Google...");
      
      signIn("google", {
        callbackUrl: "/cliente/producto",
        redirect: true,
      });
    } catch (error) {
      console.error("❌ Error al iniciar sesión:", error);
      setError("Error al iniciar sesión con Google");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleSignin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-3.5 rounded-lg border border-stroke bg-gray-2 p-[15px] font-medium hover:bg-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-opacity-50"
      >
        <GoogleIcon />
        {isLoading ? "Conectando..." : `${text} con Google`}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
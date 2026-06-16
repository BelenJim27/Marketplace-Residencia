"use client";

import { useState } from "react";
import { GoogleIcon } from "@/assets/icons";
import { signIn } from "next-auth/react";
import { useLocale } from "@/context/LocaleContext";

export default function GoogleSigninButton({ text, redirectUrl }: { text: string; redirectUrl?: string | null }) {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignin = () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("🔵 Iniciando sesión con Google...");
      
      // Sin redirectUrl explícito, volvemos a la página de sign-in para que
      // su useEffect evalúe el rol y redirija correctamente (productor → dashboard, etc.)
      const callbackUrl = redirectUrl || "/auth/sign-in";
      
      signIn("google", {
        callbackUrl,
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
        {isLoading ? t("Conectando...") : `${text} ${t("con Google")}`}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
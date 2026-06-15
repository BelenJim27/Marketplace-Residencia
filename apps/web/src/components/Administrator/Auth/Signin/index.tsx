"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import GoogleSigninButton from "../GoogleSigninButton";
import SigninWithPassword from "../SigninWithPassword";
import { useLocale } from "@/context/LocaleContext";

export default function Signin({ isVenderFlow = false }: { isVenderFlow?: boolean }) {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { t } = useLocale();

  return (
    <>
      {/* Brand header */}
      <div className="mb-8">
        <div className="mb-4">
          <Image
            src="/fotos/mezcanea.png"
            alt="Mezcanea"
            width={180}
            height={72}
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          {isVenderFlow ? t("Únete como productor") : t("Bienvenido de vuelta")}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {isVenderFlow
            ? t("Inicia sesión para continuar con tu solicitud.")
            : t("Ingresa tus credenciales para acceder a tu cuenta.")}
        </p>
      </div>

      {/* Google */}
      <GoogleSigninButton text={t("Continuar")} redirectUrl={redirectUrl} />

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-stroke dark:bg-dark-3" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t("O con correo electrónico")}
        </span>
        <span className="h-px flex-1 bg-stroke dark:bg-dark-3" />
      </div>

      {/* Form */}
      <SigninWithPassword isVenderFlow={isVenderFlow} />

      {/* Register link — only for regular flow */}
      {!isVenderFlow && (
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("¿No tienes cuenta?")}{" "}
          <Link
            href="/auth/sign-up"
            className="font-semibold text-green-600 underline underline-offset-2 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            {t("Regístrate gratis")}
          </Link>
        </p>
      )}
    </>
  );
}
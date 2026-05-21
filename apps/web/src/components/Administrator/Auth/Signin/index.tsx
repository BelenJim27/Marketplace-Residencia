import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoogleSigninButton from "../GoogleSigninButton";
import SigninWithPassword from "../SigninWithPassword";

export default function Signin({ isVenderFlow = false }: { isVenderFlow?: boolean }) {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  return (
    <>
      {/* Brand header */}
      <div className="mb-8">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-600/10 dark:bg-green-500/10">
          <span className="text-xl">🌵</span>
        </div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          {isVenderFlow ? "Únete como productor" : "Bienvenido de vuelta"}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {isVenderFlow
            ? "Inicia sesión para continuar con tu solicitud."
            : "Ingresa tus credenciales para acceder a tu cuenta."}
        </p>
      </div>

      {/* Google */}
      <GoogleSigninButton text="Continuar" redirectUrl={redirectUrl} />

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-stroke dark:bg-dark-3" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          O con correo electrónico
        </span>
        <span className="h-px flex-1 bg-stroke dark:bg-dark-3" />
      </div>

      {/* Form */}
      <SigninWithPassword isVenderFlow={isVenderFlow} />

      {/* Register link — only for regular flow */}
      {!isVenderFlow && (
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link
            href="/auth/sign-up"
            className="font-semibold text-green-600 underline underline-offset-2 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            Regístrate gratis
          </Link>
        </p>
      )}
    </>
  );
}
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoogleSigninButton from "../GoogleSigninButton";
import SigninWithPassword from "../SigninWithPassword";

export default function Signin({ isVenderFlow = false }: { isVenderFlow?: boolean }) {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  if (isVenderFlow) {
    return (
      <>
        <GoogleSigninButton text="Iniciar sesión" redirectUrl={redirectUrl} />

        <div className="my-6 flex items-center justify-center">
          <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
          <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
            O inicia sesión con tu correo
          </div>
          <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        </div>

        <div>
          <SigninWithPassword isVenderFlow={true} />
        </div>
      </>
    );
  }

  return (
    <>
      <GoogleSigninButton text="Iniciar sesión" redirectUrl={redirectUrl} />

      <div className="my-6 flex items-center justify-center">
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
          O inicia sesión con tu correo
        </div>
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
      </div>

      <div>
        <SigninWithPassword />
      </div>

      <div className="mt-6 text-center">
        <p>
          ¿No tienes una cuenta?{" "}
          <Link href="/auth/sign-up" className="text-primary">
            Registrate
          </Link>
        </p>
      </div>
    </>
  );
}
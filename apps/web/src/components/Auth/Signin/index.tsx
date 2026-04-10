import Link from "next/link";
import { signIn } from "next-auth/react";
import GoogleSigninButton from "../GoogleSigninButton";
import SigninWithPassword from "../SigninWithPassword";

export default function Signin() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <GoogleSigninButton text="Sign in" />
      </div>

      <div className="my-6 flex items-center justify-center">
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
          Or sign in with email
        </div>
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
      </div>

      <div>
        <SigninWithPassword />
      </div>

      <div className="mt-6 text-center">
        <p>
          Don't have any account?{" "}
          <Link href="/auth/sign-up" className="text-primary">
            Sign Up
          </Link>
        </p>
      </div>
    </>
  );
}

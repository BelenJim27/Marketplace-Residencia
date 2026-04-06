"use client";

import { GoogleIcon } from "@/assets/icons";
import { useRouter } from "next/navigation";

export default function GoogleSigninButton({ text }: { text: string }) {
  const router = useRouter();

  const handleGoogleSignin = () => {
    router.push("/auth/sign-in");
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignin}
      className="flex w-full items-center justify-center gap-3.5 rounded-lg border border-stroke bg-gray-2 p-[15px] font-medium hover:bg-opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-opacity-50"
    >
      <GoogleIcon />
      {text} con Google
    </button>
  );
}

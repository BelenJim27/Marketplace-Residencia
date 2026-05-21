"use client";

import Signin from "@/components/Administrator/Auth/Signin";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  "Productores artesanales verificados",
  "Envíos a todo México y el mundo",
  "Variedad única de agaves oaxaqueños",
];

function SignInContent() {
  const searchParams = useSearchParams();
  const isVenderFlow = searchParams.get("vender") === "true";
  const { isAuthenticated, loading, isAdmin, isProductor } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;

    const redirectUrl = searchParams.get("redirect");

    if (isVenderFlow) {
      router.replace("/dashboard/productor/solicitar");
      return;
    }
    if (isAdmin) {
      router.replace("/dashboard/administrador");
      return;
    }
    if (isProductor) {
      router.replace("/dashboard/productor");
      return;
    }
    if (redirectUrl) {
      router.replace(redirectUrl);
      return;
    }
    router.replace("/cliente/producto");
  }, [isAuthenticated, loading, isVenderFlow, isAdmin, isProductor, router, searchParams]);

  if (isVenderFlow) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center py-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white shadow-lg dark:bg-gray-dark p-8 sm:p-10">
            <Signin isVenderFlow={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-gray-dark min-h-[calc(100vh-5rem)]">
      <div className="flex min-h-[calc(100vh-5rem)]">
        {/* Left: Form */}
        <div className="flex w-full flex-col justify-center lg:w-[45%] p-8 sm:p-12 xl:p-16">
          <Signin />
        </div>

        {/* Right: Hero */}
        <div className="hidden lg:block lg:w-[55%] relative">
          <Image
            src="/images/login/gemmi.png"
            alt="Mezcal Oaxaca"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
          <div className="absolute inset-0 flex flex-col justify-end p-12 pb-16">
            <p className="text-green-300 text-xs font-semibold tracking-widest uppercase mb-3">
              Marketplace Artesanal
            </p>
            <h2 className="text-5xl font-bold text-white leading-tight mb-4">
              Mezcal Oaxaqueño<br />
              <span className="text-green-400">del corazón</span><br />
              de México
            </h2>
            <p className="text-white/60 text-base max-w-xs leading-relaxed mb-8">
              Conectamos productores artesanales con amantes del buen mezcal en todo el mundo.
            </p>
            <div className="flex flex-col gap-2.5">
              {FEATURES.map((feat) => (
                <div key={feat} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/25 text-green-300 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-white/75 text-sm">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
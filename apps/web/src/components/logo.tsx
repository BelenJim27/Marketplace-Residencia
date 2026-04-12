import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-20 w-50">
      <Image
        src="/images/logo/tierra_agaves.png"
        sizes="(max-width: 768px) 100vw, 50vw"
        fill
        alt="Tierra Agaves"
        role="presentation"
        quality={100}
        className="object-contain"
      />
    </div>
  );
}

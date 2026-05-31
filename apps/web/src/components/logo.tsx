import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-20 w-50">
      <Image
        src="/images/logo/agavea.png"
        sizes="(max-width: 768px) 100vw, 50vw"
        fill
        alt="AGAVEA"
        role="presentation"
        quality={100}
        className="object-contain"
      />
    </div>
  );
}

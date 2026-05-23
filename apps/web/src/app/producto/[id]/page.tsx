import { redirect } from "next/navigation";

export default function ProductoPublicoDetallePage({ params }: { params: { id: string } }) {
  redirect(`/Cliente/producto/${params.id}`);
}

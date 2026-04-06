export const getProductos = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/productos`);

  if (!res.ok) {
    throw new Error("Error al obtener productos");
  }

  return res.json();
};

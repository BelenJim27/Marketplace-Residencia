export interface ProductoCarrito {
  id_producto: number | bigint;
  nombre: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  cantidad: number;
  /** Most-restrictive age across producto + categorias. Drives the contextual age gate. */
  edad_minima?: number | null;
  peso_kg?: number | null;
  alto_cm?: number | null;
  ancho_cm?: number | null;
  largo_cm?: number | null;
}

export interface CarritoItem extends ProductoCarrito {
  cantidad: number;
}

export type AgregarProductoResult =
  | { ok: true }
  | { ok: false; reason: "age_required"; edadRequerida: number };

export interface CarritoContextType {
  items: CarritoItem[];
  cantidadTotal: number;
  precioTotal: number;
  agregarProducto: (producto: ProductoCarrito) => AgregarProductoResult;
  eliminarProducto: (id_producto: number | bigint) => void;
  actualizarCantidad: (id_producto: number | bigint, cantidad: number) => void;
  limpiarCarrito: () => void;
}

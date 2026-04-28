export interface ProductoCarrito {
  id_producto: number | bigint;
  nombre: string;
  precio_base: string;
  imagen_principal_url?: string;
  producto_imagenes?: { url: string }[];
  cantidad: number;
}

export interface CarritoItem extends ProductoCarrito {
  cantidad: number;
}

export interface CarritoContextType {
  items: CarritoItem[];
  cantidadTotal: number;
  precioTotal: number;
  agregarProducto: (producto: ProductoCarrito) => void;
  eliminarProducto: (id_producto: number | bigint) => void;
  actualizarCantidad: (id_producto: number | bigint, cantidad: number) => void;
  limpiarCarrito: () => void;
}

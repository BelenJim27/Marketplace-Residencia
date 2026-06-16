// auth.service (importado transitivamente por pedidos.service) exige secretos JWT
// al cargar el módulo; se setean antes del require para no romper el import.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-secret';
process.env.PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET ?? 'test-secret';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PedidosService } = require('./pedidos.service');

// Regresión del 500 en `POST /pedidos/:id/detalles`: dos llamadas concurrentes para el
// mismo (id_pedido, id_producto) hacen que la perdedora viole `uq_detalle_pedido_producto`
// (Prisma P2002). Antes esto se propagaba como 500 y dejaba el checkout colgado. El servicio
// debe reintentar la transacción una vez para converger al camino idempotente de ajuste.
describe('PedidosService.addDetalle (carrera P2002 → reintento idempotente)', () => {
  function makeService(prisma: any) {
    const svc = new PedidosService(
      prisma,
      {} as any, // authService
      {} as any, // comisionesService
      {} as any, // emailService
      {} as any, // skydropxService
      {} as any, // stripeService
      {} as any, // paypalService
    );
    (svc as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    return svc;
  }

  const producto = {
    id_producto: 53n,
    precio_base: '1500',
    tiendas: { id_tienda: 17, id_productor: 28, pais_operacion: 'MX' },
    lotes: { id_productor: 28 },
  };
  const dto = { id_producto: 53, cantidad: 1, precio_compra: '1500', moneda_compra: 'MXN' };

  function p2002(): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`id_pedido`,`id_producto`)',
      { code: 'P2002', clientVersion: 'test', meta: { target: ['id_pedido', 'id_producto'] } } as any,
    );
  }

  it('reintenta una vez ante P2002 y devuelve el detalle sin lanzar 500', async () => {
    const detalleFinal = { id_detalle: 1n, id_producto: 53n, cantidad: 1, precio_compra: '1500', productos: { nombre: 'Mezcal' } };
    const prisma: any = {
      productos: { findUnique: jest.fn().mockResolvedValue(producto) },
      inventario: { findFirst: jest.fn().mockResolvedValue({ stock: 50 }) }, // stock alto → sin notificación
      // 1ª transacción: la pierde la carrera (P2002). 2ª: gana por el camino de ajuste.
      $transaction: jest.fn()
        .mockRejectedValueOnce(p2002())
        .mockResolvedValueOnce(detalleFinal),
    };
    const svc = makeService(prisma);

    // isAdmin=true evita la lectura del owner (assertPedidoOwner).
    const result = await svc.addDetalle('142', dto, 'admin-uid', true);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect((svc as any).logger.warn).toHaveBeenCalled();
    expect(result).toMatchObject({ cantidad: 1 }); // devuelve el detalle, no lanza 500
  });

  it('propaga otros errores de Prisma sin reintentar', async () => {
    const otro = new Prisma.PrismaClientKnownRequestError(
      'FK violation',
      { code: 'P2003', clientVersion: 'test', meta: { field_name: 'id_productor' } } as any,
    );
    const prisma: any = {
      productos: { findUnique: jest.fn().mockResolvedValue(producto) },
      inventario: { findFirst: jest.fn() },
      $transaction: jest.fn().mockRejectedValueOnce(otro),
    };
    const svc = makeService(prisma);

    await expect(svc.addDetalle('142', dto, 'admin-uid', true)).rejects.toMatchObject({ code: 'P2003' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

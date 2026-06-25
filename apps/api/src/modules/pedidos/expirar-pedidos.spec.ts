// Marca este archivo como módulo ES para evitar colisión de declaraciones con otros specs.
export {};
// auth.service (importado transitivamente por pedidos.service) exige secretos
// JWT al cargar el módulo; se setean antes del require para no romper el import.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-secret';
process.env.PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET ?? 'test-secret';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PedidosService } = require('./pedidos.service');

// Tests enfocados en el cron expirarPedidosPendientes(): asegura que NO cancela
// pedidos con pago cobrado (protección anti webhook perdido) y que respeta la
// guardia anti-race antes de restaurar stock.
describe('PedidosService.expirarPedidosPendientes', () => {
  function makeService(prisma: any) {
    // Solo se ejercita prisma; el resto de dependencias no se usan en este flujo.
    const svc = new PedidosService(
      prisma,
      {} as any, // authService
      {} as any, // comisionesService
      {} as any, // emailService
      {} as any, // facturaPdfService
      {} as any, // skydropxService
      {} as any, // stripeService
      {} as any, // paypalService
    );
    // Silenciar logger
    (svc as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    return svc;
  }

  it('excluye pedidos con pago completado/reembolsado en el filtro del findMany', async () => {
    const prisma = {
      pedidos: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = makeService(prisma);

    await svc.expirarPedidosPendientes();

    expect(prisma.pedidos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: 'pendiente',
          eliminado_en: null,
          pagos: { none: { estado: { in: ['completado', 'reembolsado'] } } },
        }),
      }),
    );
  });

  it('no restaura stock ni audita si el pedido dejó de estar pendiente antes del commit (anti-race)', async () => {
    const tx = {
      pedidos: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      inventario: { findFirst: jest.fn(), update: jest.fn() },
      movimientos_inventario: { create: jest.fn() },
      auditoria: { create: jest.fn() },
    };
    const prisma = {
      pedidos: {
        findMany: jest.fn().mockResolvedValue([
          { id_pedido: 1n, detalle_pedido: [{ id_producto: 5n, cantidad: 2, id_detalle: 9n }] },
        ]),
      },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const svc = makeService(prisma);

    await svc.expirarPedidosPendientes();

    expect(tx.pedidos.updateMany).toHaveBeenCalledWith({
      where: { id_pedido: 1n, estado: 'pendiente' },
      data: { estado: 'cancelado' },
    });
    expect(tx.inventario.findFirst).not.toHaveBeenCalled();
    expect(tx.movimientos_inventario.create).not.toHaveBeenCalled();
    expect(tx.auditoria.create).not.toHaveBeenCalled();
  });

  it('cancela, restaura stock y audita cuando el pedido sigue pendiente', async () => {
    const tx = {
      pedidos: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      inventario: {
        findFirst: jest.fn().mockResolvedValue({ id_inventario: 7n, stock: 10 }),
        update: jest.fn().mockResolvedValue({}),
      },
      movimientos_inventario: { create: jest.fn().mockResolvedValue({}) },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      pedidos: {
        findMany: jest.fn().mockResolvedValue([
          { id_pedido: 1n, detalle_pedido: [{ id_producto: 5n, cantidad: 2, id_detalle: 9n }] },
        ]),
      },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const svc = makeService(prisma);

    await svc.expirarPedidosPendientes();

    expect(tx.inventario.update).toHaveBeenCalledWith({
      where: { id_inventario: 7n },
      data: { stock: { increment: 2 } },
    });
    expect(tx.movimientos_inventario.create).toHaveBeenCalledTimes(1);
    expect(tx.auditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'expirar_pedido_sin_pago' }),
      }),
    );
  });
});

// getMisCompras() oculta al cliente los abandonos auto-cancelados sin pago,
// pero conserva los cancelados con pago cobrado/reembolsado.
describe('PedidosService.getMisCompras', () => {
  function makeService(prisma: any) {
    const authService = { getMe: jest.fn().mockResolvedValue({ id_usuario: 'u-1' }) };
    const svc = new PedidosService(
      prisma,
      authService as any,
      {} as any, // comisionesService
      {} as any, // emailService
      {} as any, // facturaPdfService
      {} as any, // skydropxService
      {} as any, // stripeService
      {} as any, // paypalService
    );
    (svc as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    return svc;
  }

  it('filtra cancelados sin pago cobrado en el where del findMany', async () => {
    const prisma = {
      pedidos: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = makeService(prisma);

    await svc.getMisCompras('token-x');

    expect(prisma.pedidos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_usuario: 'u-1',
          eliminado_en: null,
          NOT: {
            estado: 'cancelado',
            pagos: { none: { estado: { in: ['completado', 'reembolsado'] } } },
          },
        }),
      }),
    );
  });
});

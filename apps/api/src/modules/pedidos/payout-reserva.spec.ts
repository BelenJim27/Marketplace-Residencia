// Marca este archivo como módulo ES para evitar colisión de declaraciones con otros specs.
export {};
// auth.service (importado transitivamente por pedidos.service) exige secretos JWT
// al cargar el módulo; se setean antes del require para no romper el import.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-secret';
process.env.PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET ?? 'test-secret';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PedidosService } = require('./pedidos.service');

// C-1: la reserva atómica del payout (updateMany where id_payout: null) debe impedir
// la doble transferencia. Si otro proceso ya reclamó la fila (claim.count === 0), NO
// se debe ejecutar el transfer y el payout placeholder debe revertirse.
describe('PedidosService.triggerPayoutForProductor (reserva atómica C-1)', () => {
  function makeService(prisma: any, stripeService: any) {
    const svc = new PedidosService(
      prisma,
      {} as any, // authService
      {} as any, // comisionesService
      {} as any, // emailService
      {} as any, // skydropxService
      stripeService as any,
      {} as any, // paypalService
    );
    (svc as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    return svc;
  }

  const basePp = {
    id_payout: null,
    monto_neto_productor: '100.00',
    subtotal_bruto: '100.00',
    comision_marketplace: '5.00',
    productores: { stripe_account_id: 'acct_x', stripe_onboarding_completed: true, id_usuario: 'u-1' },
    pedidos: { pagos: [{ payment_intent_id: 'pi_x', proveedor: 'stripe' }] },
  };

  it('aborta sin transferir y revierte el placeholder cuando otro proceso ya reclamó (claim.count=0)', async () => {
    const prisma: any = {
      pedido_productor: {
        findUnique: jest.fn().mockResolvedValue(basePp),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }), // reserva perdida
      },
      payouts: {
        create: jest.fn().mockResolvedValue({ id_payout: 99n }),
        delete: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    };
    const stripeService = {
      countOpenDisputesForPaymentIntent: jest.fn().mockResolvedValue(0),
      createTransfer: jest.fn(),
    };
    const svc = makeService(prisma, stripeService);

    await (svc as any).triggerPayoutForProductor(1n, 1, 'MXN');

    expect(stripeService.createTransfer).not.toHaveBeenCalled();
    expect(prisma.payouts.delete).toHaveBeenCalledWith({ where: { id_payout: 99n } });
    expect(prisma.payouts.update).not.toHaveBeenCalled();
  });

  it('transfiere una sola vez y marca procesado cuando gana la reserva (claim.count=1)', async () => {
    const prisma: any = {
      pedido_productor: {
        findUnique: jest.fn().mockResolvedValue(basePp),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }), // reserva ganada
      },
      payouts: {
        create: jest.fn().mockResolvedValue({ id_payout: 99n }),
        delete: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const stripeService = {
      countOpenDisputesForPaymentIntent: jest.fn().mockResolvedValue(0),
      createTransfer: jest.fn().mockResolvedValue({ id: 'tr_123' }),
    };
    const svc = makeService(prisma, stripeService);

    await (svc as any).triggerPayoutForProductor(1n, 1, 'MXN');

    expect(stripeService.createTransfer).toHaveBeenCalledTimes(1);
    expect(stripeService.createTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ destination: 'acct_x', idempotencyKey: 'transfer-1-1' }),
    );
    expect(prisma.payouts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payout: 99n },
        data: expect.objectContaining({ estado: 'procesado', referencia_externa: 'tr_123' }),
      }),
    );
    expect(prisma.payouts.delete).not.toHaveBeenCalled();
  });
});

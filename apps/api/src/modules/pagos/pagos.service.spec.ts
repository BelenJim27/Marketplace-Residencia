import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { PaypalService } from './paypal.service';
import { EmailService } from '../email/email.service';
import { ComisionesService } from '../comisiones/comisiones.service';
import { EnviosService } from '../envios/envios.service';
import { TasasCambioService } from '../tasas-cambio/tasas-cambio.service';

const mockStripe = {
  createPaymentIntent: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  createRefund: jest.fn(),
  createTransferReversal: jest.fn(),
  createTransfer: jest.fn(),
  retrieveAccount: jest.fn(),
  constructWebhookEvent: jest.fn(),
  getProcessingFee: jest.fn(),
  countOpenDisputesForPaymentIntent: jest.fn(),
};

const mockPaypal = {
  createOrder: jest.fn(),
  captureOrder: jest.fn(),
  createRefund: jest.fn(),
  createPayout: jest.fn(),
  verifyWebhookSignature: jest.fn(),
};

const mockEmail = {
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminAlert: jest.fn().mockResolvedValue(undefined),
};

const mockComisiones = {
  resolver: jest.fn().mockResolvedValue({ id_comision: 1, porcentaje: 0.10, monto_fijo: null, alcance: 'global' }),
  calcularMonto: jest.fn().mockReturnValue(10),
};

const mockEnvios = {
  crearEnviosPorProductor: jest.fn().mockResolvedValue([]),
};

const mockTasasCambio = {
  // Por defecto: tasa vigente y NO obsoleta (los tests de bloqueo la sobreescriben).
  getVigente: jest.fn().mockResolvedValue({ tasa: '18.2', stale: false }),
  convertir: jest.fn(),
};

const mockPrisma: any = {
  pagos: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  pedidos: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  pedido_productor: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  detalle_pedido: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  usuarios: { findUnique: jest.fn() },
  tasas_impuesto: { findMany: jest.fn() },
  tasas_cambio: { findFirst: jest.fn() },
  inventario: { findFirst: jest.fn(), update: jest.fn() },
  movimientos_inventario: { create: jest.fn() },
  notificaciones: { create: jest.fn() },
  envio_cotizaciones: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  webhook_events_log: { create: jest.fn() },
  payouts: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  refunds: { create: jest.fn(), update: jest.fn() },
  payment_fees: { create: jest.fn() },
  $queryRaw: jest.fn(),
  $transaction: jest.fn((fn: (tx: any) => any) => fn(mockPrisma)),
};

function makePago(overrides: any = {}) {
  return {
    id_pago: BigInt(1),
    id_pedido: BigInt(1),
    proveedor: 'stripe',
    payment_intent_id: 'pi_test123',
    estado: 'completado',
    monto: '500.00',
    moneda: 'MXN',
    creado_en: new Date(),
    ...overrides,
  };
}

describe('PagosService', () => {
  let service: PagosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Restore default implementations cleared by clearAllMocks
    mockEmail.sendOrderConfirmationEmail.mockResolvedValue(undefined);
    mockEmail.sendAdminAlert.mockResolvedValue(undefined);
    mockComisiones.resolver.mockResolvedValue({ id_comision: 1, porcentaje: 0.10, monto_fijo: null, alcance: 'global' });
    mockComisiones.calcularMonto.mockReturnValue(10);
    mockEnvios.crearEnviosPorProductor.mockResolvedValue([]);
    // Defaults para registros financieros (refunds/fees) limpiados por clearAllMocks
    mockPrisma.refunds.create.mockResolvedValue({ id_refund: 1n });
    mockPrisma.refunds.update.mockResolvedValue({});
    mockPrisma.payment_fees.create.mockResolvedValue({});
    mockStripe.getProcessingFee?.mockResolvedValue?.(null);
    mockTasasCambio.getVigente.mockResolvedValue({ tasa: '18.2', stale: false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
        { provide: PaypalService, useValue: mockPaypal },
        { provide: EmailService, useValue: mockEmail },
        { provide: ComisionesService, useValue: mockComisiones },
        { provide: EnviosService, useValue: mockEnvios },
        { provide: TasasCambioService, useValue: mockTasasCambio },
      ],
    }).compile();
    service = module.get<PagosService>(PagosService);
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('deduplicateWebhookEvent', () => {
    it('returns true when event is new (insert succeeds)', async () => {
      mockPrisma.webhook_events_log.create.mockResolvedValue({});
      const result = await service.deduplicateWebhookEvent('stripe', 'evt_001', 'payment_intent.succeeded');
      expect(result).toBe(true);
    });

    it('returns false when event is duplicate (P2002 unique constraint)', async () => {
      const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockPrisma.webhook_events_log.create.mockRejectedValue(err);
      const result = await service.deduplicateWebhookEvent('stripe', 'evt_001', 'payment_intent.succeeded');
      expect(result).toBe(false);
    });

    it('re-throws non-P2002 errors', async () => {
      const err = Object.assign(new Error('DB connection failed'), { code: 'P1001' });
      mockPrisma.webhook_events_log.create.mockRejectedValue(err);
      await expect(
        service.deduplicateWebhookEvent('stripe', 'evt_001', 'payment_intent.succeeded'),
      ).rejects.toThrow('DB connection failed');
    });
  });

  describe('confirmStripePayment', () => {
    it('marca el pago como completado cuando el PaymentIntent está succeeded', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ id_pedido: 1n, id_usuario: 'u1', estado: 'pagado' });
      mockPrisma.pagos.findFirst.mockResolvedValueOnce(makePago({ estado: 'pendiente' }));
      mockStripe.retrievePaymentIntent.mockResolvedValue({ id: 'pi_test123', status: 'succeeded', transfer_data: null, metadata: {} });
      const spy = jest.spyOn(service, 'updatePaymentStatus').mockResolvedValue({} as any);

      const res = await service.confirmStripePayment('1', 'u1');

      expect(spy).toHaveBeenCalledWith('pi_test123', 'completado', false, undefined);
      expect(res).toEqual({ estado: 'pagado', confirmado: true });
    });

    it('no confirma cuando el PaymentIntent no está succeeded', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ id_pedido: 1n, id_usuario: 'u1', estado: 'pendiente' });
      mockPrisma.pagos.findFirst.mockResolvedValueOnce(makePago({ estado: 'pendiente' }));
      mockStripe.retrievePaymentIntent.mockResolvedValue({ id: 'pi_test123', status: 'requires_payment_method' });
      const spy = jest.spyOn(service, 'updatePaymentStatus').mockResolvedValue({} as any);

      const res = await service.confirmStripePayment('1', 'u1');

      expect(spy).not.toHaveBeenCalled();
      expect(res).toEqual({ estado: 'pendiente', confirmado: false });
    });

    it('no truena ni consulta Stripe cuando no hay payment_intent', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ id_pedido: 1n, id_usuario: 'u1', estado: 'pendiente' });
      mockPrisma.pagos.findFirst.mockResolvedValueOnce(null);
      const spy = jest.spyOn(service, 'updatePaymentStatus').mockResolvedValue({} as any);

      const res = await service.confirmStripePayment('1', 'u1');

      expect(mockStripe.retrievePaymentIntent).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
      expect(res).toEqual({ estado: 'pendiente', confirmado: false });
    });

    it('rechaza si el pedido no pertenece al usuario', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ id_pedido: 1n, id_usuario: 'otro' });
      await expect(service.confirmStripePayment('1', 'u1')).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('validarEdadDelComprador (private)', () => {
    const callMethod = (service: any, idPedido: bigint, idUsuario: string) =>
      service.validarEdadDelComprador(idPedido, idUsuario);

    it('is a no-op when no products have age restrictions', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      await expect(callMethod(service, BigInt(1), 'user-1')).resolves.toBeUndefined();
      expect(mockPrisma.usuarios.findUnique).not.toHaveBeenCalled();
    });

    it('is a no-op when pedido has no items', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      await expect(callMethod(service, BigInt(1), 'user-1')).resolves.toBeUndefined();
    });

    it('throws BadRequestException AGE_DOB_REQUIRED when buyer has no fecha_nacimiento', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { requiere_edad_minima: 18, categorias_productos: [] },
      }]);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ fecha_nacimiento: null });
      await expect(callMethod(service, BigInt(1), 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'AGE_DOB_REQUIRED', edadRequerida: 18 }),
      });
    });

    it('throws BadRequestException AGE_DOB_REQUIRED when usuario record not found', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { requiere_edad_minima: 18, categorias_productos: [] },
      }]);
      mockPrisma.usuarios.findUnique.mockResolvedValue(null);
      await expect(callMethod(service, BigInt(1), 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'AGE_DOB_REQUIRED' }),
      });
    });

    it('throws BadRequestException AGE_INSUFFICIENT when buyer is under required age', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { requiere_edad_minima: 21, categorias_productos: [] },
      }]);
      const dob19 = new Date();
      dob19.setFullYear(dob19.getFullYear() - 19);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ fecha_nacimiento: dob19 });
      await expect(callMethod(service, BigInt(1), 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'AGE_INSUFFICIENT', edadRequerida: 21 }),
      });
    });

    it('passes when buyer exactly meets the required age (boundary)', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { requiere_edad_minima: 18, categorias_productos: [] },
      }]);
      const exactlyToday18 = new Date();
      exactlyToday18.setFullYear(exactlyToday18.getFullYear() - 18);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ fecha_nacimiento: exactlyToday18 });
      await expect(callMethod(service, BigInt(1), 'user-1')).resolves.toBeUndefined();
    });

    it('uses the most restrictive edad from categorías', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: {
          requiere_edad_minima: 0,
          categorias_productos: [{ categorias: { requiere_edad_minima: 21 } }],
        },
      }]);
      const dob19 = new Date();
      dob19.setFullYear(dob19.getFullYear() - 19);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ fecha_nacimiento: dob19 });
      await expect(callMethod(service, BigInt(1), 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'AGE_INSUFFICIENT', edadRequerida: 21 }),
      });
    });

    it('product-level edad overrides categoria when more restrictive', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: {
          requiere_edad_minima: 25,
          categorias_productos: [{ categorias: { requiere_edad_minima: 18 } }],
        },
      }]);
      const dob20 = new Date();
      dob20.setFullYear(dob20.getFullYear() - 20);
      mockPrisma.usuarios.findUnique.mockResolvedValue({ fecha_nacimiento: dob20 });
      await expect(callMethod(service, BigInt(1), 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'AGE_INSUFFICIENT', edadRequerida: 25 }),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('validarSubtotalContraDB (private)', () => {
    const callMethod = (service: any, idPedido: bigint, subtotalCliente: number) =>
      service.validarSubtotalContraDB(idPedido, subtotalCliente);

    it('throws BadRequestException when pedido has no items', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      await expect(callMethod(service, BigInt(1), 100)).rejects.toThrow(BadRequestException);
      await expect(callMethod(service, BigInt(1), 100)).rejects.toThrow('no tiene ítems');
    });

    it('passes when client subtotal exactly matches DB', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { precio_compra: '100.00', cantidad: 2 },
        { precio_compra: '50.00', cantidad: 1 },
      ]);
      await expect(callMethod(service, BigInt(1), 250)).resolves.toBeUndefined();
    });

    it('passes within $0.05 tolerance (above)', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { precio_compra: '100.00', cantidad: 2 }, // DB = 200
      ]);
      await expect(callMethod(service, BigInt(1), 200.04)).resolves.toBeUndefined();
    });

    it('passes within $0.05 tolerance (below)', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { precio_compra: '100.00', cantidad: 2 }, // DB = 200
      ]);
      await expect(callMethod(service, BigInt(1), 199.96)).resolves.toBeUndefined();
    });

    it('throws BadRequestException when client amount is more than $0.05 below DB total', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { precio_compra: '100.00', cantidad: 2 }, // DB = 200
      ]);
      await expect(callMethod(service, BigInt(1), 199.94)).rejects.toThrow('no coincide');
    });

    it('throws BadRequestException when client amount is more than $0.05 above DB total', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { precio_compra: '100.00', cantidad: 2 }, // DB = 200
      ]);
      await expect(callMethod(service, BigInt(1), 200.06)).rejects.toThrow('no coincide');
    });

    it('handles precio_compra as string (Prisma Decimal)', async () => {
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { precio_compra: '99.99', cantidad: 3 }, // DB = 299.97
      ]);
      await expect(callMethod(service, BigInt(1), 299.97)).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('validarShippingContraDB (private)', () => {
    const callMethod = (service: any, idPedido: bigint, shippingCliente: number) =>
      service.validarShippingContraDB(idPedido, shippingCliente);

    it('throws BadRequestException when shippingCliente is negative', async () => {
      await expect(callMethod(service, BigInt(1), -1)).rejects.toThrow('no puede ser negativo');
    });

    it('throws COTIZACIONES_EXPIRADAS when quotes exist but all expired', async () => {
      mockPrisma.envio_cotizaciones.findMany.mockResolvedValue([]);
      mockPrisma.envio_cotizaciones.count.mockResolvedValue(3); // expiradas
      await expect(callMethod(service, BigInt(1), 150)).rejects.toThrow('COTIZACIONES_EXPIRADAS');
    });

    it('throws generic error when no quotes exist at all', async () => {
      mockPrisma.envio_cotizaciones.findMany.mockResolvedValue([]);
      mockPrisma.envio_cotizaciones.count.mockResolvedValue(0);
      await expect(callMethod(service, BigInt(1), 150)).rejects.toThrow('Se requieren cotizaciones');
    });

    it('passes when client shipping exactly equals cotized amount', async () => {
      mockPrisma.envio_cotizaciones.findMany.mockResolvedValue([
        { precio_total: '150.00' },
        { precio_total: '80.00' },
      ]);
      await expect(callMethod(service, BigInt(1), 230)).resolves.toBeUndefined();
    });

    it('passes when client is at exactly 98% of cotized (boundary)', async () => {
      mockPrisma.envio_cotizaciones.findMany.mockResolvedValue([
        { precio_total: '230.00' },
      ]);
      // 230 * 0.98 = 225.4
      await expect(callMethod(service, BigInt(1), 225.4)).resolves.toBeUndefined();
    });

    it('throws when client shipping is below 98% of cotized amount', async () => {
      mockPrisma.envio_cotizaciones.findMany.mockResolvedValue([
        { precio_total: '230.00' },
      ]);
      // 230 * 0.98 = 225.4 → 225.3 should fail
      await expect(callMethod(service, BigInt(1), 225.3)).rejects.toThrow('no coincide');
    });

    it('skips price check when total cotizado is zero (free shipping)', async () => {
      mockPrisma.envio_cotizaciones.findMany.mockResolvedValue([
        { precio_total: '0' },
      ]);
      await expect(callMethod(service, BigInt(1), 0)).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('calcularImpuestos (private)', () => {
    const callMethod = (service: any, subtotal: number, shipping: number, pais: string, cats: number[] = []) =>
      service.calcularImpuestos(subtotal, shipping, pais, cats);

    it('returns taxAmount=0 and empty breakdown when no rates configured', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([]);
      const result = await callMethod(service, 100, 50, 'MX');
      expect(result).toEqual({ taxAmount: 0, taxBreakdown: [] });
    });

    it('calculates IVA 16% on base = subtotal + shipping', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([{
        tipo: 'IVA', nombre: 'IVA 16%', tasa_porcentaje: '0.16',
      }]);
      const result = await callMethod(service, 100, 50, 'MX');
      // base = 150, tax = 150 * 0.16 = 24.0
      expect(result.taxAmount).toBe(24);
      expect(result.taxBreakdown).toHaveLength(1);
      expect(result.taxBreakdown[0]).toEqual({ tipo: 'IVA', nombre: 'IVA 16%', tasa: 0.16, monto: 24 });
    });

    it('sums multiple tax rates', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([
        { tipo: 'IVA', nombre: 'IVA 16%', tasa_porcentaje: '0.16' },
        { tipo: 'FET', nombre: 'FET 26.5%', tasa_porcentaje: '0.265' },
      ]);
      const result = await callMethod(service, 100, 0, 'US');
      // base = 100, IVA = 16, FET = 26.5 → total = 42.5
      expect(result.taxAmount).toBe(42.5);
      expect(result.taxBreakdown).toHaveLength(2);
    });

    it('uppercases pais before querying tasas_impuesto', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([]);
      await callMethod(service, 100, 0, 'us');
      expect(mockPrisma.tasas_impuesto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pais_iso2: 'US' }),
        }),
      );
    });

    it('passes categoriaIds in the query filter', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([]);
      await callMethod(service, 100, 0, 'US', [5, 10]);
      const callArg = mockPrisma.tasas_impuesto.findMany.mock.calls[0][0];
      const andFilter = callArg.where.AND[0];
      // Should include OR with id_categoria: { in: [5, 10] }
      expect(JSON.stringify(andFilter)).toContain('[5,10]');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('validarTasaCambioVigente (A-1)', () => {
    const call = (s: any, pais?: string) => s.validarTasaCambioVigente(pais);

    it('no consulta la tasa ni bloquea para destino MX', async () => {
      await expect(call(service, 'MX')).resolves.toBeUndefined();
      expect(mockTasasCambio.getVigente).not.toHaveBeenCalled();
    });

    it('bloquea cuando la tasa MXN→USD está obsoleta (stale) para destino US', async () => {
      mockTasasCambio.getVigente.mockResolvedValue({ tasa: '18.2', stale: true });
      await expect(call(service, 'US')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bloquea cuando no hay tasa disponible (getVigente lanza)', async () => {
      mockTasasCambio.getVigente.mockRejectedValue(new Error('sin tasa'));
      await expect(call(service, 'US')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite cuando la tasa está vigente y fresca', async () => {
      mockTasasCambio.getVigente.mockResolvedValue({ tasa: '18.2', stale: false });
      await expect(call(service, 'US')).resolves.toBeUndefined();
    });
  });

  describe('validarNexoFiscal (C-3)', () => {
    const call = (s: any, pais: string, estado?: string) => s.validarNexoFiscal(pais, estado);
    const ayer = new Date(Date.now() - 86400000);
    const manana = new Date(Date.now() + 86400000);

    it('no bloquea cuando no hay nexo declarado para el destino', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([]);
      await expect(call(service, 'US', 'TX')).resolves.toBeUndefined();
    });

    it('bloquea cuando hay nexo declarado pero sin tasa vigente', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([
        { estado_codigo: 'TX', activo: true, vigente_desde: ayer, vigente_hasta: ayer, tasa_porcentaje: '0.0825' },
      ]);
      await expect(call(service, 'US', 'TX')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('bloquea cuando hay nexo declarado pero la tasa está inactiva o nula', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([
        { estado_codigo: 'TX', activo: false, vigente_desde: ayer, vigente_hasta: manana, tasa_porcentaje: '0.0825' },
        { estado_codigo: 'TX', activo: true, vigente_desde: ayer, vigente_hasta: manana, tasa_porcentaje: null },
      ]);
      await expect(call(service, 'US', 'TX')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite cuando hay nexo declarado con tasa vigente y activa', async () => {
      mockPrisma.tasas_impuesto.findMany.mockResolvedValue([
        { estado_codigo: 'TX', activo: true, vigente_desde: ayer, vigente_hasta: manana, tasa_porcentaje: '0.0825' },
      ]);
      await expect(call(service, 'US', 'TX')).resolves.toBeUndefined();
    });
  });

  describe('resolverCobro (C-4)', () => {
    const call = (s: any, pais: string, m: { subtotal: number; shipping: number; tax: number }) => s.resolverCobro(pais, m);

    it('MX: cobra en MXN sin conversión (tasa 1)', async () => {
      const r = await call(service, 'MX', { subtotal: 100, shipping: 20, tax: 16 });
      expect(r.moneda).toBe('MXN');
      expect(r.tasa).toBe(1);
      expect(r.total).toBe(136);
      expect(r.totalMxn).toBe(136);
    });

    it('US: cobra en USD con tasa congelada y conserva el equivalente MXN', async () => {
      mockTasasCambio.getVigente.mockResolvedValue({ tasa: '0.05', stale: false });
      const r = await call(service, 'US', { subtotal: 1000, shipping: 200, tax: 0 });
      expect(r.moneda).toBe('USD');
      expect(r.tasa).toBe(0.05);
      expect(r.subtotal).toBe(50);
      expect(r.shipping).toBe(10);
      expect(r.total).toBe(60);
      expect(r.totalMxn).toBe(1200); // contabilidad/payout siempre en MXN
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('recalcularDistribucionPedido (private)', () => {
    const callMethod = (service: any, idPedido: bigint, moneda: string) =>
      service.recalcularDistribucionPedido(idPedido, moneda);

    it('is a no-op when pedido not found', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue(null);
      await callMethod(service, BigInt(1), 'MXN');
      expect(mockPrisma.pedido_productor.updateMany).not.toHaveBeenCalled();
    });

    it('is a no-op when pedido has no items', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ tax_amount: '20', shipping_amount: '10' });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      await callMethod(service, BigInt(1), 'MXN');
      expect(mockPrisma.pedido_productor.updateMany).not.toHaveBeenCalled();
    });

    it('is a no-op when subtotalTotal is zero', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ tax_amount: '20', shipping_amount: '10' });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { id_productor: 1, precio_compra: '0', cantidad: 1 },
      ]);
      await callMethod(service, BigInt(1), 'MXN');
      expect(mockPrisma.pedido_productor.updateMany).not.toHaveBeenCalled();
    });

    it('does NOT prorate tax/shipping; bruto = producer product subtotal (IVA en precio, envío retenido)', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ tax_amount: '40', shipping_amount: '20' });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { id_productor: 1, precio_compra: '300', cantidad: 1 }, // 75%
        { id_productor: 2, precio_compra: '100', cantidad: 1 }, // 25%
      ]);
      // Política nueva: el IVA va dentro del precio y el envío lo retiene la plataforma.
      // P1: bruto = 300 (sin tax/envío). P2: bruto = 100.
      mockComisiones.calcularMonto.mockReturnValueOnce(34.5).mockReturnValueOnce(11.5);

      await callMethod(service, BigInt(1), 'MXN');

      expect(mockPrisma.pedido_productor.updateMany).toHaveBeenCalledTimes(2);

      const calls = mockPrisma.pedido_productor.updateMany.mock.calls;
      const p1Call = calls.find((c: any) => c[0].where.id_productor === 1);
      const p2Call = calls.find((c: any) => c[0].where.id_productor === 2);

      expect(p1Call[0].data.subtotal_bruto).toBe('300.00');
      expect(p1Call[0].data.comision_marketplace).toBe('34.50');
      expect(p1Call[0].data.monto_neto_productor).toBe('265.50');

      expect(p2Call[0].data.subtotal_bruto).toBe('100.00');
    });

    it('calls comisionesService.resolver with correct id_productor', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ tax_amount: '0', shipping_amount: '0' });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { id_productor: 7, precio_compra: '100', cantidad: 1 },
      ]);

      await callMethod(service, BigInt(1), 'MXN');

      expect(mockComisiones.resolver).toHaveBeenCalledWith({ id_productor: 7 });
    });

    it('stores id_comision_aplicada from resolved commission', async () => {
      mockPrisma.pedidos.findUnique.mockResolvedValue({ tax_amount: '0', shipping_amount: '0' });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { id_productor: 1, precio_compra: '100', cantidad: 1 },
      ]);
      mockComisiones.resolver.mockResolvedValue({ id_comision: 42, porcentaje: 0.12, monto_fijo: null, alcance: 'productor' });

      await callMethod(service, BigInt(1), 'MXN');

      expect(mockPrisma.pedido_productor.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id_comision_aplicada: 42 }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('updatePaymentStatus', () => {
    function setupCompletedPago(extras: any = {}) {
      const pago = {
        ...makePago({ estado: 'pendiente' }),
        pedidos: {
          id_pedido: BigInt(1),
          usuarios: { nombre: 'Juan', apellido_paterno: 'García', email: 'buyer@test.com' },
        },
        ...extras,
      };
      mockPrisma.pagos.findFirst.mockResolvedValue(pago);
      mockPrisma.pagos.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pagos.findUnique.mockResolvedValue({ ...makePago({ estado: 'completado' }), pedidos: {} });
      mockPrisma.pedidos.update.mockResolvedValue({});
      mockPrisma.pedido_productor.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pedidos.findUnique.mockResolvedValue({ shipping_amount: '0', tax_amount: '0', moneda: 'MXN', detalle_pedido: [] });
      return pago;
    }

    it('dead-letter: no lanza y no marca pedido cuando el intent no coincide con ningún pago', async () => {
      // Antes lanzaba NotFoundException, lo que provocaba reintentos infinitos de
      // Stripe. Ahora registra/alerta y resuelve, evitando el retry storm.
      mockPrisma.pagos.findFirst.mockResolvedValue(null);
      await expect(service.updatePaymentStatus('pi_unknown', 'completado')).resolves.toBeNull();
      expect(mockPrisma.pedidos.update).not.toHaveBeenCalled();
    });

    it('updates with atomic guard { notIn: [completado, reembolsado, cancelado] }', async () => {
      setupCompletedPago();
      await service.updatePaymentStatus('pi_test123', 'completado');
      expect(mockPrisma.pagos.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: { notIn: ['completado', 'reembolsado', 'cancelado'] },
          }),
        }),
      );
    });

    it('C-7: registra payment_fees con el fee real de Stripe al completar el pago', async () => {
      setupCompletedPago({ proveedor: 'stripe' });
      mockStripe.getProcessingFee.mockResolvedValue({ feeMinor: 580, currency: 'MXN' });

      await service.updatePaymentStatus('pi_test123', 'completado');

      expect(mockPrisma.payment_fees.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ proveedor: 'stripe', monto_fee: '5.800000', moneda: 'MXN' }),
        }),
      );
    });

    it('C-7: no registra payment_fees si no hay fee disponible', async () => {
      setupCompletedPago({ proveedor: 'stripe' });
      mockStripe.getProcessingFee.mockResolvedValue(null);

      await service.updatePaymentStatus('pi_test123', 'completado');

      expect(mockPrisma.payment_fees.create).not.toHaveBeenCalled();
    });

    it('is idempotent: returns existing pago when updateMany count=0', async () => {
      const pago = makePago({ estado: 'completado' });
      mockPrisma.pagos.findFirst.mockResolvedValue({ ...pago, pedidos: { usuarios: null } });
      mockPrisma.pagos.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.updatePaymentStatus('pi_test123', 'completado');

      expect(result).toBeDefined();
      expect(mockPrisma.pedidos.update).not.toHaveBeenCalled();
    });

    it('updates pedido estado to "pagado" when completado', async () => {
      setupCompletedPago();
      await service.updatePaymentStatus('pi_test123', 'completado');
      expect(mockPrisma.pedidos.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'pagado' } }),
      );
    });

    it('updates pedido_productor rows to "confirmado" when completado', async () => {
      setupCompletedPago();
      await service.updatePaymentStatus('pi_test123', 'completado');
      expect(mockPrisma.pedido_productor.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'confirmado' } }),
      );
    });

    it('updates pedido estado to "pendiente" when fallido', async () => {
      const pago = makePago({ estado: 'pendiente' });
      mockPrisma.pagos.findFirst.mockResolvedValue({ ...pago, pedidos: { usuarios: null } });
      mockPrisma.pagos.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pagos.findUnique.mockResolvedValue({ ...pago, estado: 'fallido', pedidos: {} });
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.updatePaymentStatus('pi_test123', 'fallido');

      expect(mockPrisma.pedidos.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'pendiente' } }),
      );
    });

    it('sends confirmation email when buyer has email', async () => {
      setupCompletedPago();
      await service.updatePaymentStatus('pi_test123', 'completado');
      await new Promise(resolve => setImmediate(resolve));
      expect(mockEmail.sendOrderConfirmationEmail).toHaveBeenCalledWith(
        'buyer@test.com',
        expect.any(String),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it('does not propagate error when email sending fails', async () => {
      setupCompletedPago();
      mockEmail.sendOrderConfirmationEmail.mockRejectedValue(new Error('SMTP error'));
      await expect(service.updatePaymentStatus('pi_test123', 'completado')).resolves.toBeDefined();
    });

    it('crearGuiasPostPago calls crearEnviosPorProductor when enviosService is set', async () => {
      // Test the private method directly; inject enviosService via property to bypass @Optional() DI metadata issue
      (service as any).enviosService = mockEnvios;
      mockPrisma.pedidos.update.mockResolvedValue({});

      await (service as any).crearGuiasPostPago(BigInt(1));

      expect(mockEnvios.crearEnviosPorProductor).toHaveBeenCalledWith(1);
    });

    it('crearGuiasPostPago is a no-op when enviosService is null', async () => {
      (service as any).enviosService = null;
      await (service as any).crearGuiasPostPago(BigInt(1));
      expect(mockEnvios.crearEnviosPorProductor).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('reembolsarPago', () => {
    it('throws NotFoundException when pago not found', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(null);
      await expect(service.reembolsarPago('1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when pago is already reembolsado', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago({ estado: 'reembolsado' }));
      await expect(service.reembolsarPago('1')).rejects.toThrow('ya fue reembolsado');
    });

    it('throws BadRequestException when pago estado is not completado', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago({ estado: 'pendiente' }));
      await expect(service.reembolsarPago('1')).rejects.toThrow('Solo se pueden reembolsar pagos completados');
    });

    it('throws BadRequestException when payment_intent_id is null', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago({ payment_intent_id: null }));
      await expect(service.reembolsarPago('1')).rejects.toThrow('Sin payment_intent_id');
    });

    it('issues Stripe refund with reverseTransfer when transfer_data.destination is set (direct charge)', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: { destination: 'acct_123' } });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockStripe.createRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test123',
        reverseTransfer: true,
        refundApplicationFee: true,
      });
    });

    it('issues Stripe refund without reverseTransfer for manual transfers', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockStripe.createRefund).toHaveBeenCalledWith({ paymentIntentId: 'pi_test123' });
    });

    it('marks payout as reversal_pendiente_manual when transfer reversal fails', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([{
        payout: { id_payout: BigInt(5), referencia_externa: 'tr_abc' },
      }]);
      mockStripe.createTransferReversal.mockRejectedValue(new Error('Transfer already reversed'));
      mockPrisma.payouts.update.mockResolvedValue({});
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockPrisma.payouts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'reversal_pendiente_manual' }),
        }),
      );
    });

    it('sends admin alert when transfer reversal fails', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([{
        payout: { id_payout: BigInt(5), referencia_externa: 'tr_abc' },
      }]);
      mockStripe.createTransferReversal.mockRejectedValue(new Error('Cannot reverse'));
      mockPrisma.payouts.update.mockResolvedValue({});
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockEmail.sendAdminAlert).toHaveBeenCalledWith(
        expect.stringContaining('Reversal manual'),
        expect.any(String),
      );
    });

    it('does NOT block the refund when transfer reversal fails (best-effort)', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([{
        payout: { id_payout: BigInt(5), referencia_externa: 'tr_abc' },
      }]);
      mockStripe.createTransferReversal.mockRejectedValue(new Error('Failure'));
      mockPrisma.payouts.update.mockResolvedValue({});
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      // Should resolve without throwing even when reversal fails
      await expect(service.reembolsarPago('1')).resolves.toBeDefined();
      expect(mockPrisma.pagos.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'reembolsado' }) }),
      );
    });

    it('restores inventory stock for each order item', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { id_producto: BigInt(1), cantidad: 3, id_pedido: BigInt(1) },
      ]);
      mockPrisma.inventario.findFirst.mockResolvedValue({ id_inventario: 10, stock: 5 });
      mockPrisma.inventario.update.mockResolvedValue({});
      mockPrisma.movimientos_inventario.create.mockResolvedValue({});
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockPrisma.inventario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stock: { increment: 3 } },
        }),
      );
    });

    it('creates movimiento_inventario with tipo cancelacion', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { id_producto: BigInt(1), cantidad: 2, id_pedido: BigInt(1) },
      ]);
      mockPrisma.inventario.findFirst.mockResolvedValue({ id_inventario: 10, stock: 5 });
      mockPrisma.inventario.update.mockResolvedValue({});
      mockPrisma.movimientos_inventario.create.mockResolvedValue({});
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockPrisma.movimientos_inventario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tipo: 'cancelacion', cantidad: 2 }),
        }),
      );
    });

    it('skips inventory restore when no inventario record found for product', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { id_producto: BigInt(99), cantidad: 1, id_pedido: BigInt(1) },
      ]);
      mockPrisma.inventario.findFirst.mockResolvedValue(null);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await expect(service.reembolsarPago('1')).resolves.toBeDefined();
      expect(mockPrisma.inventario.update).not.toHaveBeenCalled();
    });

    it('marks pagos=reembolsado and pedidos=cancelado', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago());
      mockStripe.retrievePaymentIntent.mockResolvedValue({ transfer_data: null });
      mockStripe.createRefund.mockResolvedValue({ id: 're_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockPrisma.pagos.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'reembolsado' }) }),
      );
      expect(mockPrisma.pedidos.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'cancelado' } }),
      );
    });

    it('calls paypalService.createRefund for PayPal payments', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago({ proveedor: 'paypal' }));
      mockPaypal.createRefund.mockResolvedValue({ refundId: 'ref_1', status: 'COMPLETED' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([]);
      mockPrisma.pagos.update.mockResolvedValue({});
      mockPrisma.pedidos.update.mockResolvedValue({});

      await service.reembolsarPago('1');

      expect(mockPaypal.createRefund).toHaveBeenCalledWith('pi_test123');
      expect(mockStripe.retrievePaymentIntent).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException for PayPal when transfer reversal fails', async () => {
      mockPrisma.pagos.findUnique.mockResolvedValue(makePago({ proveedor: 'paypal' }));
      mockPaypal.createRefund.mockResolvedValue({ refundId: 'ref_1' });
      mockPrisma.pedido_productor.findMany.mockResolvedValue([{
        payout: { referencia_externa: 'tr_stripe_abc' },
      }]);
      mockStripe.createTransferReversal.mockRejectedValue(new Error('Cannot reverse'));
      mockPrisma.pagos.update.mockResolvedValue({});

      await expect(service.reembolsarPago('1')).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('retryFailedTransfers (cron)', () => {
    it('does nothing when no failed payouts exist', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([]);
      await service.retryFailedTransfers();
      expect(mockStripe.createTransfer).not.toHaveBeenCalled();
      expect(mockPaypal.createPayout).not.toHaveBeenCalled();
    });

    it('does not propagate error when DB is unavailable (graceful degradation)', async () => {
      mockPrisma.payouts.findMany.mockRejectedValue(new Error('connection refused'));
      await expect(service.retryFailedTransfers()).resolves.toBeUndefined();
    });

    it('retries Stripe transfer and marks as procesado on success', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(1),
        proveedor: 'stripe',
        intentos: 1,
        monto_neto: '100.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 1,
          productores: {
            stripe_account_id: 'acct_test',
            stripe_onboarding_completed: true,
            paypal_email: null,
          },
        }],
      }]);
      mockStripe.createTransfer.mockResolvedValue({ id: 'tr_new123' });
      mockPrisma.payouts.update.mockResolvedValue({});

      await service.retryFailedTransfers();

      expect(mockStripe.createTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ destination: 'acct_test', amountCents: 10000 }),
      );
      expect(mockPrisma.payouts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'procesado', referencia_externa: 'tr_new123' }),
        }),
      );
    });

    it('marks payout as agotado when intentos reaches MAX_INTENTOS (5)', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(1),
        proveedor: 'stripe',
        intentos: 4, // nuevosIntentos = 5 = MAX
        monto_neto: '100.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 1,
          productores: { stripe_account_id: 'acct_test', stripe_onboarding_completed: true, paypal_email: null },
        }],
      }]);
      mockStripe.createTransfer.mockRejectedValue(new Error('Account closed'));
      mockPrisma.payouts.update.mockResolvedValue({});

      await service.retryFailedTransfers();

      expect(mockPrisma.payouts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'agotado' }),
        }),
      );
    });

    it('sends admin alert when payout is exhausted', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(1),
        proveedor: 'stripe',
        intentos: 4,
        monto_neto: '100.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 1,
          productores: { stripe_account_id: 'acct_test', stripe_onboarding_completed: true, paypal_email: null },
        }],
      }]);
      mockStripe.createTransfer.mockRejectedValue(new Error('Account closed'));
      mockPrisma.payouts.update.mockResolvedValue({});

      await service.retryFailedTransfers();

      expect(mockEmail.sendAdminAlert).toHaveBeenCalledWith(
        expect.stringContaining('Payout agotado'),
        expect.any(String),
      );
    });

    it('keeps estado=fallido and increments intentos when not yet exhausted', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(1),
        proveedor: 'stripe',
        intentos: 2, // nuevosIntentos = 3 < 5
        monto_neto: '100.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 1,
          productores: { stripe_account_id: 'acct_test', stripe_onboarding_completed: true, paypal_email: null },
        }],
      }]);
      mockStripe.createTransfer.mockRejectedValue(new Error('Temporary error'));
      mockPrisma.payouts.update.mockResolvedValue({});

      await service.retryFailedTransfers();

      expect(mockPrisma.payouts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'fallido', intentos: 3 }),
        }),
      );
    });

    it('calculates exponential backoff: intentos=1 → nuevosIntentos=2 → 60 min', async () => {
      const fixedNow = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(1),
        proveedor: 'stripe',
        intentos: 1, // nuevosIntentos=2 → 15*2^2=60 min
        monto_neto: '100.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 1,
          productores: { stripe_account_id: 'acct_test', stripe_onboarding_completed: true, paypal_email: null },
        }],
      }]);
      mockStripe.createTransfer.mockRejectedValue(new Error('Error'));
      mockPrisma.payouts.update.mockResolvedValue({});

      await service.retryFailedTransfers();

      const updateCall = mockPrisma.payouts.update.mock.calls[0][0];
      const expectedMs = fixedNow + 60 * 60_000;
      expect(updateCall.data.proximo_reintento.getTime()).toBe(expectedMs);

      jest.restoreAllMocks();
    });

    it('skips Stripe retry when productor has no stripe onboarding', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(1),
        proveedor: 'stripe',
        intentos: 0,
        monto_neto: '100.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 1,
          productores: { stripe_account_id: null, stripe_onboarding_completed: false, paypal_email: null },
        }],
      }]);

      await service.retryFailedTransfers();

      expect(mockStripe.createTransfer).not.toHaveBeenCalled();
    });

    it('skips PayPal retry when productor has no paypal_email', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(2),
        proveedor: 'paypal',
        intentos: 0,
        monto_neto: '50.00',
        moneda: 'USD',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 2,
          productores: { stripe_account_id: null, stripe_onboarding_completed: false, paypal_email: null },
        }],
      }]);

      await service.retryFailedTransfers();

      expect(mockPaypal.createPayout).not.toHaveBeenCalled();
    });

    it('retries PayPal payout and marks as procesado on success', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(2),
        proveedor: 'paypal',
        intentos: 1,
        monto_neto: '850.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 2,
          productores: { stripe_account_id: null, stripe_onboarding_completed: false, paypal_email: 'prod@test.com' },
        }],
      }]);
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' }); // 850/17 = 50 USD
      mockPaypal.createPayout.mockResolvedValue({ batchId: 'BATCH_ABC', status: 'PENDING' });
      mockPrisma.payouts.update.mockResolvedValue({});

      await service.retryFailedTransfers();

      expect(mockPaypal.createPayout).toHaveBeenCalledWith(
        expect.objectContaining({ amountUSD: 50, paypalEmail: 'prod@test.com' }),
      );
      expect(mockPrisma.payouts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'procesado', referencia_externa: 'BATCH_ABC' }),
        }),
      );
    });

    it('marks payout as fallido when exchange rate missing for PayPal MXN payout', async () => {
      mockPrisma.payouts.findMany.mockResolvedValue([{
        id_payout: BigInt(2),
        proveedor: 'paypal',
        intentos: 0,
        monto_neto: '850.00',
        moneda: 'MXN',
        pedido_productor: [{
          id_pedido: BigInt(1),
          id_productor: 2,
          productores: { stripe_account_id: null, stripe_onboarding_completed: false, paypal_email: 'prod@test.com' },
        }],
      }]);
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue(null);
      mockPrisma.payouts.update.mockResolvedValue({});

      // Should not throw — error should be caught and payout marked failed
      await expect(service.retryFailedTransfers()).resolves.toBeUndefined();
      expect(mockPrisma.payouts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'fallido' }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('handleDisputeClosed', () => {
    it('does nothing when no pago found for paymentIntentId', async () => {
      mockPrisma.pagos.findFirst.mockResolvedValue(null);
      await service.handleDisputeClosed('pi_unknown', 'won');
      expect(mockPrisma.payouts.updateMany).not.toHaveBeenCalled();
    });

    it('does nothing when no pending payouts exist for the pedido', async () => {
      mockPrisma.pagos.findFirst.mockResolvedValue({ id_pago: BigInt(1), id_pedido: BigInt(1) });
      mockPrisma.payouts.findMany.mockResolvedValue([]);
      await service.handleDisputeClosed('pi_test123', 'won');
      expect(mockPrisma.payouts.updateMany).not.toHaveBeenCalled();
    });

    it('resets intentos=0 and proximo_reintento=null when dispute is won', async () => {
      mockPrisma.pagos.findFirst.mockResolvedValue({ id_pago: BigInt(1), id_pedido: BigInt(1) });
      mockPrisma.payouts.findMany.mockResolvedValue([
        { id_payout: BigInt(1), id_productor: 1 },
        { id_payout: BigInt(2), id_productor: 2 },
      ]);
      mockPrisma.payouts.updateMany.mockResolvedValue({ count: 2 });

      await service.handleDisputeClosed('pi_test123', 'won');

      expect(mockPrisma.payouts.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            intentos: 0,
            proximo_reintento: null,
            ultimo_error: 'Disputa ganada — reintento automático',
          }),
        }),
      );
    });

    it('marks payouts as agotado when dispute is lost', async () => {
      mockPrisma.pagos.findFirst.mockResolvedValue({ id_pago: BigInt(1), id_pedido: BigInt(1) });
      mockPrisma.payouts.findMany.mockResolvedValue([{ id_payout: BigInt(1), id_productor: 1 }]);
      mockPrisma.payouts.updateMany.mockResolvedValue({ count: 1 });

      await service.handleDisputeClosed('pi_test123', 'lost');

      expect(mockPrisma.payouts.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'agotado',
            ultimo_error: 'Disputa perdida — pago retenido por plataforma',
          }),
        }),
      );
    });

    it('does nothing for unknown dispute status', async () => {
      mockPrisma.pagos.findFirst.mockResolvedValue({ id_pago: BigInt(1), id_pedido: BigInt(1) });
      mockPrisma.payouts.findMany.mockResolvedValue([{ id_payout: BigInt(1), id_productor: 1 }]);

      await service.handleDisputeClosed('pi_test123', 'under_review');

      expect(mockPrisma.payouts.updateMany).not.toHaveBeenCalled();
    });
  });
});

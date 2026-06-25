process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-secret';
process.env.PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET ?? 'test-secret';

import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PedidosService } = require('./pedidos.service');

describe('PedidosService facturación (una venta = una factura activa)', () => {
  const dto = {
    rfc_receptor: 'XAXX010101000',
    nombre_razon_social: 'Cliente Prueba',
    uso_cfdi: 'G03',
    regimen_fiscal: '616',
    email_factura: 'cliente@example.com',
    codigo_postal: '68000',
  };

  const pedidoPagado = {
    id_pedido: 10n,
    id_usuario: 'cliente-1',
    estado: 'pagado',
    eliminado_en: null,
    total: new Prisma.Decimal('1160.00'),
    tax_amount: new Prisma.Decimal('160.00'),
    moneda: 'MXN',
    usuarios: { email: 'cliente@example.com', nombre: 'Cliente', apellido_paterno: 'Prueba' },
    pagos: [{ id_pago: 1n }],
    detalle_pedido: [{ cantidad: 1, precio_compra: new Prisma.Decimal('1000.00'), productos: { nombre: 'Mezcal' } }],
  };

  const factura = {
    id_factura: 20n,
    id_pedido: 10n,
    creado_en: new Date('2026-06-23T12:00:00Z'),
    estado: 'preliminar',
    subtotal: new Prisma.Decimal('1000.00'),
    impuestos_total: new Prisma.Decimal('160.00'),
    total: new Prisma.Decimal('1160.00'),
    moneda: 'MXN',
    rfc_emisor: null,
    rfc_receptor: dto.rfc_receptor,
    nombre_razon_social: dto.nombre_razon_social,
    email_factura: dto.email_factura,
    codigo_postal: dto.codigo_postal,
    uso_cfdi: dto.uso_cfdi,
    regimen_fiscal: dto.regimen_fiscal,
  };

  function p2002() {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on uq_facturas_pedido_activa',
      { code: 'P2002', clientVersion: 'test', meta: { target: ['id_pedido'] } } as any,
    );
  }

  function makeService(overrides: any = {}) {
    const tx = {
      pedidos: { findUnique: jest.fn().mockResolvedValue(pedidoPagado) },
      facturas: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(factura),
      },
      ...overrides.tx,
    };
    const prisma: any = {
      $transaction: jest.fn((callback: any) => callback(tx)),
      pedidos: { findUnique: jest.fn() },
      ...overrides.prisma,
    };
    const emailService = { sendFacturaEmail: jest.fn().mockResolvedValue(undefined) };
    const facturaPdfService = { generate: jest.fn().mockResolvedValue(Buffer.from('%PDF')) };
    const service = new PedidosService(
      prisma,
      {} as any,
      {} as any,
      emailService,
      facturaPdfService,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, prisma, tx, emailService, facturaPdfService };
  }

  it('permite generar una factura para un pedido pagado sin factura activa', async () => {
    const { service, tx } = makeService();

    const result = await service.addFactura('10', dto, 'cliente-1', false);

    expect(result).toMatchObject({ id_factura: '20', estado: 'preliminar' });
    expect(tx.facturas.create).toHaveBeenCalledTimes(1);
    expect(tx.facturas.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        id_pedido: 10n,
        subtotal: new Prisma.Decimal('1000.00'),
        total: new Prisma.Decimal('1160.00'),
        estado: 'preliminar',
      }),
    }));
  });

  it('rechaza un pedido que no tiene pago completado', async () => {
    const tx = {
      pedidos: { findUnique: jest.fn().mockResolvedValue({ ...pedidoPagado, estado: 'pendiente', pagos: [] }) },
      facturas: { findFirst: jest.fn(), create: jest.fn() },
    };
    const { service } = makeService({ tx });

    await expect(service.addFactura('10', dto, 'cliente-1', false)).rejects.toThrow(
      'Solo se pueden facturar pedidos con un pago completado y vigente',
    );
    expect(tx.facturas.create).not.toHaveBeenCalled();
  });

  it('muestra la factura existente y rechaza la generación directa por API', async () => {
    const tx = {
      pedidos: { findUnique: jest.fn().mockResolvedValue(pedidoPagado) },
      facturas: { findFirst: jest.fn().mockResolvedValue({ id_factura: 20n }), create: jest.fn() },
    };
    const { service } = makeService({ tx });

    await expect(service.addFactura('10', dto, 'cliente-1', false)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.facturas.create).not.toHaveBeenCalled();
  });

  it('crea una sola factura ante dos solicitudes simultáneas', async () => {
    const tx = {
      pedidos: { findUnique: jest.fn().mockResolvedValue(pedidoPagado) },
      facturas: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValueOnce(factura).mockRejectedValueOnce(p2002()),
      },
    };
    const { service } = makeService({ tx });

    const results = await Promise.allSettled([
      service.addFactura('10', dto, 'cliente-1', false),
      service.addFactura('10', dto, 'cliente-1', false),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(tx.facturas.create).toHaveBeenCalledTimes(2);
  });

  it('permite consultar y descargar la factura activa del propietario', async () => {
    const pedidoConFactura = { ...pedidoPagado, facturas: [factura] };
    const { service, prisma, facturaPdfService } = makeService();
    prisma.pedidos.findUnique.mockResolvedValue(pedidoConFactura);

    const existente = await service.getFactura('10', 'cliente-1', false);
    const pdf = await service.getFacturaPdf('10', 'cliente-1', false);

    expect(existente).toMatchObject({ id_factura: '20' });
    expect(pdf).toEqual(Buffer.from('%PDF'));
    expect(facturaPdfService.generate).toHaveBeenCalledTimes(1);
  });
});

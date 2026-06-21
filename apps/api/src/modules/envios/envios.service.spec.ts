import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EnviosService } from './envios.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SkydropxService } from './skydropx.service';
import { EmailService } from '../email/email.service';

const mockSkydropx = {
  cotizarEnvio: jest.fn(),
  createShipment: jest.fn(),
  getTracking: jest.fn(),
};

const mockEmail = {
  sendTrackingUpdateEmail: jest.fn(),
};

const mockPrisma: any = {
  envios: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  envio_guias: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  envio_eventos: { create: jest.fn() },
  envio_cotizaciones: { findFirst: jest.fn(), create: jest.fn() },
  tasas_cambio: { findFirst: jest.fn() },
  detalle_pedido: { findMany: jest.fn(), findFirst: jest.fn() },
  pedido_productor: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  productos: { findMany: jest.fn() },
  restricciones_envio_categoria: { findUnique: jest.fn() },
  transportistas: { findUnique: jest.fn() },
  servicios_envio: { findUnique: jest.fn() },
  $transaction: jest.fn((fn: (tx: any) => any) => fn(mockPrisma)),
};

function makeEnvio(overrides: any = {}) {
  return {
    id_envio: BigInt(1),
    id_pedido: BigInt(1),
    id_transportista: null,
    numero_rastreo: null,
    valor_declarado_aduana: null,
    moneda_aduana: 'MXN',
    codigo_hs: '2208.40',
    peso_kg: '1.000',
    alto_cm: '10.00',
    ancho_cm: '10.00',
    largo_cm: '10.00',
    estado: 'preparando',
    requires_adult_signature: false,
    pedidos: {
      direccion_envio_snapshot: { pais_iso2: 'MX', estado: 'OAX', ciudad: 'Oaxaca', codigo_postal: '68000' },
      total: '500.00',
      moneda: 'MXN',
    },
    transportistas: null,
    servicios_envio: null,
    envio_guias: [],
    ...overrides,
  };
}

function makeProductorConBodega() {
  return {
    productores: {
      nombre_marca: 'Mezcal Artesanal',
      direccion_bodega: {
        linea_1: 'Calle Principal 1',
        ciudad: 'Oaxaca de Juárez',
        estado: 'Oaxaca',
        codigo_postal: '68000',
        pais_iso2: 'MX',
        telefono: '9511234567',
      },
    },
  };
}

function makeProductoBasico(id: number, idProductor: number, overrides: any = {}) {
  return {
    id_producto: BigInt(id),
    nombre: `Producto ${id}`,
    peso_kg: '1',
    largo_cm: '10',
    ancho_cm: '10',
    alto_cm: '10',
    requiere_edad_minima: 0,
    precio_base: '100',
    tiendas: {
      id_productor: idProductor,
      productores: {
        id_productor: idProductor,
        nombre_marca: `Productor ${idProductor}`,
        direccion_bodega: null,
      },
    },
    ...overrides,
  };
}

describe('EnviosService', () => {
  let service: EnviosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnviosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SkydropxService, useValue: mockSkydropx },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();
    service = module.get<EnviosService>(EnviosService);
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('cotizarCarrito', () => {
    const destino = { pais: 'MX', estado: 'CDMX', ciudad: 'Ciudad de México', codigo_postal: '06600' };

    it('returns [] for empty items array without calling DB', async () => {
      const result = await service.cotizarCarrito([], destino);
      expect(result).toEqual([]);
      expect(mockPrisma.productos.findMany).not.toHaveBeenCalled();
    });

    it('returns [] when no products found in DB', async () => {
      mockPrisma.productos.findMany.mockResolvedValue([]);
      const result = await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);
      expect(result).toEqual([]);
    });

    it('returns [] when product has no tienda/productor link', async () => {
      mockPrisma.productos.findMany.mockResolvedValue([
        { ...makeProductoBasico(1, 1), tiendas: null },
      ]);
      const result = await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);
      expect(result).toEqual([]);
    });

    it('groups by producer and calls cotizarEnvio once per producer', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        makeProductoBasico(1, 1),
        makeProductoBasico(2, 2),
      ]);

      await service.cotizarCarrito([
        { id_producto: 1, cantidad: 1 },
        { id_producto: 2, cantidad: 1 },
      ], destino);

      expect(mockSkydropx.cotizarEnvio).toHaveBeenCalledTimes(2);
    });

    it('uses volumetric weight when it exceeds real weight', async () => {
      // qty=2, peso=0.1 → real=0.2kg. Piso conservador de paquete: maxLargo=max(30,10)=30,
      // maxAncho=max(12,20)=20, alturaTotal=10×2=20 → vol=(30×20×20)/5000=2.4kg (gana volumétrico).
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        { ...makeProductoBasico(1, 1), peso_kg: '0.1', largo_cm: '10', ancho_cm: '20', alto_cm: '10' },
      ]);

      await service.cotizarCarrito([{ id_producto: 1, cantidad: 2 }], destino);

      const callArg = mockSkydropx.cotizarEnvio.mock.calls[0][0];
      expect(callArg.peso_kg).toBeCloseTo(2.4, 2);
    });

    it('uses real weight when it exceeds volumetric weight', async () => {
      // peso=5 → real=5kg; 5×5×5/5000=0.025kg vol
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        { ...makeProductoBasico(1, 1), peso_kg: '5', largo_cm: '5', ancho_cm: '5', alto_cm: '5' },
      ]);

      await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      const callArg = mockSkydropx.cotizarEnvio.mock.calls[0][0];
      expect(callArg.peso_kg).toBe(5);
    });

    it('applies conservative fallback dimensions 30×12×12 when product fields are null', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        { ...makeProductoBasico(1, 1), peso_kg: null, largo_cm: null, ancho_cm: null, alto_cm: null },
      ]);

      await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      const callArg = mockSkydropx.cotizarEnvio.mock.calls[0][0];
      // Sin dims: fallback conservador 30×12×12 (evita subcotizar). peso real=1kg (default),
      // vol=(30×12×12)/5000=0.864 → gana el real.
      expect(callArg.peso_kg).toBe(1);
      expect(callArg.largo_cm).toBe(30);
      expect(callArg.ancho_cm).toBe(12);
      expect(callArg.alto_cm).toBe(12);
    });

    it('sets adult_signature=true when any product has requiere_edad_minima >= 18', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        { ...makeProductoBasico(1, 1), requiere_edad_minima: 18 },
      ]);

      await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      const callArg = mockSkydropx.cotizarEnvio.mock.calls[0][0];
      expect(callArg.adult_signature).toBe(true);
    });

    it('does not set adult_signature when requiere_edad_minima is 0', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        makeProductoBasico(1, 1),
      ]);

      await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      const callArg = mockSkydropx.cotizarEnvio.mock.calls[0][0];
      expect(callArg.adult_signature).toBeUndefined();
    });

    it('marks contiene_alcohol=true in result for alcohol products', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        { ...makeProductoBasico(1, 1), requiere_edad_minima: 18 },
      ]);

      const result = await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      expect((result[0] as any).contiene_alcohol).toBe(true);
    });

    it('uses direccion_bodega as shipper when available', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([{
        ...makeProductoBasico(1, 1),
        tiendas: {
          id_productor: 1,
          productores: {
            id_productor: 1,
            nombre_marca: 'P1',
            direccion_bodega: { codigo_postal: '68000', estado: 'Oaxaca', ciudad: 'Oaxaca' },
          },
        },
      }]);

      await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      const callArg = mockSkydropx.cotizarEnvio.mock.calls[0][0];
      expect(callArg.shipper).toEqual({ codigo_postal: '68000', estado: 'Oaxaca', ciudad: 'Oaxaca' });
    });

    it('passes shipper=undefined when producer has no bodega', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([makeProductoBasico(1, 1)]);

      await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      const callArg = mockSkydropx.cotizarEnvio.mock.calls[0][0];
      expect(callArg.shipper).toBeUndefined();
    });

    it('returns error entry for a producer that throws, without failing others', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockPrisma.productos.findMany.mockResolvedValue([
        makeProductoBasico(1, 1),
        makeProductoBasico(2, 2),
      ]);
      mockSkydropx.cotizarEnvio
        .mockRejectedValueOnce(new Error('Timeout carrier'))
        .mockResolvedValueOnce([]);

      const result = await service.cotizarCarrito([
        { id_producto: 1, cantidad: 1 },
        { id_producto: 2, cantidad: 1 },
      ], destino);

      expect(result).toHaveLength(2);
      const failed = result.find(r => 'error' in r) as any;
      const succeeded = result.find(r => !('error' in r));
      expect(failed?.error).toBe('Timeout carrier');
      expect(failed?.quotes).toEqual([]);
      expect(succeeded).toBeDefined();
    });

    it('returns error entry when no exchange rate configured', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue(null);
      mockPrisma.productos.findMany.mockResolvedValue([makeProductoBasico(1, 1)]);

      const result = await service.cotizarCarrito([{ id_producto: 1, cantidad: 1 }], destino);

      expect((result[0] as any).error).toContain('tasa de cambio');
      expect((result[0] as any).quotes).toEqual([]);
    });

    it('returns peso_real_kg and peso_facturable_kg in result', async () => {
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17' });
      mockSkydropx.cotizarEnvio.mockResolvedValue([]);
      mockPrisma.productos.findMany.mockResolvedValue([
        { ...makeProductoBasico(1, 1), peso_kg: '2' },
      ]);

      const result = await service.cotizarCarrito([{ id_producto: 1, cantidad: 2 }], destino);

      expect((result[0] as any).peso_real_kg).toBe(4);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('crearGuia', () => {
    function setupHappyPath() {
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'Mezcal', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK123',
        labelBuffer: Buffer.from('%PDFfakedata'),
        labelFormat: 'PDF',
        cost: 150.00,
        currency: 'MXN',
        carrierName: 'DHL',
      });
      mockPrisma.envio_guias.create.mockResolvedValue({
        id_guia: BigInt(1),
        id_envio: BigInt(1),
        numero_guia: 'TRK123',
        formato_etiqueta: 'PDF',
        estado_paqueteria: 'creada',
        payload_response: {},
        fecha_creacion: new Date(),
        eliminado_en: null,
        label_pdf: null,
      });
      mockPrisma.envios.update.mockResolvedValue({
        ...makeEnvio(),
        numero_rastreo: 'TRK123',
        estado: 'label_purchased',
        costo_envio: '150.00',
      });
    }

    it('throws NotFoundException when envío not found', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(null);
      await expect(service.crearGuia('1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException GUIA_YA_EXISTE when active guía exists', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        envio_guias: [{ id_guia: BigInt(1), eliminado_en: null }],
      });
      await expect(service.crearGuia('1')).rejects.toThrow(ConflictException);
    });

    it('ConflictException message contains GUIA_YA_EXISTE', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        envio_guias: [{ id_guia: BigInt(1), eliminado_en: null }],
      });
      await expect(service.crearGuia('1')).rejects.toMatchObject({ message: 'GUIA_YA_EXISTE' });
    });

    it('throws UnprocessableEntityException when direccion_envio_snapshot is null', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        pedidos: { direccion_envio_snapshot: null, total: null, moneda: 'MXN' },
      });
      await expect(service.crearGuia('1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('UnprocessableEntityException message contains SIN_DIRECCION', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        pedidos: { direccion_envio_snapshot: null, total: null, moneda: 'MXN' },
      });
      await expect(service.crearGuia('1')).rejects.toMatchObject({ message: 'SIN_DIRECCION' });
    });

    it('throws UnprocessableEntityException for alcohol product restricted in destination state', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        pedidos: {
          direccion_envio_snapshot: { pais_iso2: 'US', estado: 'TX', ciudad: 'Houston', codigo_postal: '77001' },
          total: '500.00',
          moneda: 'USD',
        },
      });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: {
          nombre: 'Mezcal Espadín',
          requiere_edad_minima: 18,
          categorias_productos: [{ id_categoria: 5, categorias: { codigo_hs_default: null } }],
        },
      }]);
      mockPrisma.restricciones_envio_categoria.findUnique.mockResolvedValue({ permitido: false });

      await expect(service.crearGuia('1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('does not check restrictions when product has no age restriction', async () => {
      setupHappyPath();

      await service.crearGuia('1');

      expect(mockPrisma.restricciones_envio_categoria.findUnique).not.toHaveBeenCalled();
    });

    it('does not throw when restriction record shows permitido=true', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        pedidos: {
          direccion_envio_snapshot: { pais_iso2: 'US', estado: 'TX', ciudad: 'Houston', codigo_postal: '77001' },
          total: '500.00',
          moneda: 'USD',
        },
      });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: {
          nombre: 'Mezcal',
          requiere_edad_minima: 18,
          categorias_productos: [{ id_categoria: 5, categorias: { codigo_hs_default: '2208.40' } }],
        },
      }]);
      mockPrisma.restricciones_envio_categoria.findUnique.mockResolvedValue({ permitido: true });
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK123',
        labelBuffer: Buffer.from('%PDFfakedata'),
        labelFormat: 'PDF',
      });
      mockPrisma.envio_guias.create.mockResolvedValue({ id_guia: BigInt(1), numero_guia: 'TRK123', formato_etiqueta: 'PDF', label_pdf: null });
      mockPrisma.envios.update.mockResolvedValue(makeEnvio());

      await expect(service.crearGuia('1')).resolves.toBeDefined();
    });

    it('throws InternalServerErrorException when no MXN→USD exchange rate configured', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue(null);

      await expect(service.crearGuia('1')).rejects.toThrow(InternalServerErrorException);
    });

    it('throws NotFoundException when producer has no bodega address', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue({
        productores: { nombre_marca: 'P1', direccion_bodega: null },
      });
      mockPrisma.detalle_pedido.findFirst.mockResolvedValue(null);

      await expect(service.crearGuia('1')).rejects.toThrow(NotFoundException);
    });

    it('falls back to detalle_pedido for producer address when pedido_productor returns null', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(null);
      mockPrisma.detalle_pedido.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK123',
        labelBuffer: Buffer.from('%PDFfakedata'),
        labelFormat: 'PDF',
        cost: 100,
        currency: 'MXN',
        carrierName: 'DHL',
      });
      mockPrisma.envio_guias.create.mockResolvedValue({ id_guia: BigInt(1), numero_guia: 'TRK123', formato_etiqueta: 'PDF', label_pdf: null });
      mockPrisma.envios.update.mockResolvedValue(makeEnvio());

      await expect(service.crearGuia('1')).resolves.toBeDefined();
      expect(mockSkydropx.createShipment).toHaveBeenCalledTimes(1);
    });

    // Valor declarado 100% automático: el manual (valor_declarado_aduana) se IGNORA.
    it('computes declared value from producer subtotal_bruto (MXN→USD), ignoring any manual value', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        // Aunque venga un valor manual viejo, debe ignorarse.
        valor_declarado_aduana: '9999',
        moneda_aduana: 'USD',
      });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue({
        ...makeProductorConBodega(),
        id_productor: 7,
        subtotal_bruto: '1750', // MXN reales del productor
      });
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK1',
        labelBuffer: Buffer.from('%PDFfakedata'),
        labelFormat: 'PDF',
      });
      mockPrisma.envio_guias.create.mockResolvedValue({ id_guia: BigInt(1), numero_guia: 'TRK1', formato_etiqueta: 'PDF', label_pdf: null });
      mockPrisma.envios.update.mockResolvedValue(makeEnvio());

      await service.crearGuia('1');

      const shipmentCallArg = mockSkydropx.createShipment.mock.calls[0][0];
      expect(shipmentCallArg.valor_declarado_usd).toBeCloseTo(100, 2); // 1750 / 17.5 = 100
    });

    it('falls back to sum of detalle_pedido line items when subtotal_bruto is absent', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([
        { productos: { nombre: 'P1', requiere_edad_minima: 0, categorias_productos: [] }, precio_compra: '500', cantidad: 2 },
        { productos: { nombre: 'P2', requiere_edad_minima: 0, categorias_productos: [] }, precio_compra: '750', cantidad: 1 },
      ]);
      // pedido_productor sin subtotal_bruto → usa la suma de detalle_pedido (500*2 + 750 = 1750)
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK1',
        labelBuffer: Buffer.from('%PDFfakedata'),
        labelFormat: 'PDF',
      });
      mockPrisma.envio_guias.create.mockResolvedValue({ id_guia: BigInt(1), numero_guia: 'TRK1', formato_etiqueta: 'PDF', label_pdf: null });
      mockPrisma.envios.update.mockResolvedValue(makeEnvio());

      await service.crearGuia('1');

      const shipmentCallArg = mockSkydropx.createShipment.mock.calls[0][0];
      expect(shipmentCallArg.valor_declarado_usd).toBeCloseTo(100, 2); // 1750 / 17.5 = 100
    });

    it('throws UnprocessableEntityException when no real product value can be determined', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        valor_declarado_aduana: null,
        pedidos: {
          direccion_envio_snapshot: { pais_iso2: 'MX', estado: 'OAX' },
          total: null,
          moneda: 'MXN',
        },
      });
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });

      await expect(service.crearGuia('1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('marca la guía in_creation (pendiente) cuando createShipment no devuelve labelBuffer', async () => {
      // Soporte de etiquetas asíncronas (internacionales/sandbox): sin labelBuffer la guía
      // se persiste 'in_creation' y se completa luego (cron/refrescarGuiaPendiente), en vez de fallar.
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK1',
        providerShipmentId: 'SHP1',
        labelBuffer: undefined,
        labelFormat: 'PDF',
      });
      mockPrisma.envio_guias.create.mockResolvedValue({ id_guia: BigInt(1), numero_guia: 'SHP1', formato_etiqueta: 'PDF', label_pdf: null, estado_paqueteria: 'in_creation' });
      mockPrisma.envios.update.mockResolvedValue(makeEnvio());

      const result = await service.crearGuia('1');

      expect(result.pendiente).toBe(true);
      expect(result.tiene_pdf).toBe(false);
    });

    it('throws UnprocessableEntityException when labelBuffer does not start with %PDF', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({ payload_response: null });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK1',
        labelBuffer: Buffer.from('NOTAPDF'),
        labelFormat: 'PDF',
      });

      await expect(service.crearGuia('1')).rejects.toThrow('no es un PDF válido');
    });

    it('creates envio_guias and updates envios inside transaction on happy path', async () => {
      setupHappyPath();

      const result = await service.crearGuia('1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.envio_guias.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ numero_guia: 'TRK123' }),
        }),
      );
      expect(mockPrisma.envios.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'label_purchased',
            numero_rastreo: 'TRK123',
          }),
        }),
      );
      expect(result.tiene_pdf).toBe(true);
      expect(result.label_pdf).toBeUndefined();
    });

    it('stores costo_envio when carrier returns a cost', async () => {
      setupHappyPath();

      await service.crearGuia('1');

      expect(mockPrisma.envios.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ costo_envio: '150.00' }),
        }),
      );
    });

    it('includes tarifa_fallback=true in result when carrier used fallback rate', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(makeEnvio());
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        productos: { nombre: 'P', requiere_edad_minima: 0, categorias_productos: [] },
      }]);
      mockPrisma.pedido_productor.findFirst.mockResolvedValue(makeProductorConBodega());
      mockPrisma.envio_cotizaciones.findFirst.mockResolvedValue({
        payload_response: { providerName: 'FedEx', productName: 'PRIORITY' },
      });
      mockPrisma.tasas_cambio.findFirst.mockResolvedValue({ tasa: '17.5' });
      mockSkydropx.createShipment.mockResolvedValue({
        trackingNumber: 'TRK123',
        labelBuffer: Buffer.from('%PDFfakedata'),
        labelFormat: 'PDF',
        tarifa_fallback: true,
        tarifa_original_solicitada: 'FedEx/PRIORITY',
      });
      mockPrisma.envio_guias.create.mockResolvedValue({ id_guia: BigInt(1), numero_guia: 'TRK123', formato_etiqueta: 'PDF', label_pdf: null });
      mockPrisma.envios.update.mockResolvedValue(makeEnvio());

      const result = await service.crearGuia('1');

      expect(result.tarifa_fallback).toBe(true);
      expect(result.tarifa_original_solicitada).toBe('FedEx/PRIORITY');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('normalizarEstado — via registrarEventoPorGuia', () => {
    function setupGuia(estadoRetorno = 'en_transito') {
      mockPrisma.envio_guias.findUnique.mockResolvedValue({
        id_guia: BigInt(1),
        id_envio: BigInt(1),
        id_transportista: null,
        numero_guia: 'TRK001',
        envios: { id_envio: BigInt(1), estado: 'preparando' },
      });
      mockPrisma.envio_eventos.create.mockResolvedValue({});
      mockPrisma.envios.update.mockResolvedValue({ id_envio: BigInt(1), estado: estadoRetorno });
    }

    it('throws NotFoundException when número de guía not found', async () => {
      mockPrisma.envio_guias.findUnique.mockResolvedValue(null);
      await expect(
        service.registrarEventoPorGuia('UNKNOWN', 'desc', 'in_transit'),
      ).rejects.toThrow(NotFoundException);
    });

    const mappings: Array<[string, string]> = [
      ['delivered', 'entregado'],
      ['in_transit', 'en_transito'],
      ['out_of_delivery', 'en_reparto'],
      ['collected', 'recogido'],
      ['incident', 'fallido'],
      ['pending', 'preparando'],
      ['label_created', 'preparando'],
      ['transit', 'en_transito'],
      ['exception', 'fallido'],
      ['returned', 'devuelto'],
      ['delay', 'retrasado'],
      ['out_for_delivery', 'en_reparto'],
    ];

    test.each(mappings)('maps "%s" → "%s"', async (input, expected) => {
      setupGuia(expected);
      await service.registrarEventoPorGuia('TRK001', 'Evento', input);
      expect(mockPrisma.envios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: expected }) }),
      );
    });

    it('is case-insensitive: "DELIVERED" maps to "entregado"', async () => {
      setupGuia('entregado');
      await service.registrarEventoPorGuia('TRK001', 'Entregado', 'DELIVERED');
      expect(mockPrisma.envios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'entregado' }) }),
      );
    });

    it('trims whitespace before mapping: " delivered " → "entregado"', async () => {
      setupGuia('entregado');
      await service.registrarEventoPorGuia('TRK001', 'Entregado', ' delivered ');
      expect(mockPrisma.envios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'entregado' }) }),
      );
    });

    it('stores raw estado when status is unknown (normalizarEstado returns null)', async () => {
      setupGuia('estado_raro_xyz');
      await service.registrarEventoPorGuia('TRK001', 'Evento raro', 'estado_raro_xyz');
      expect(mockPrisma.envios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: 'estado_raro_xyz' }) }),
      );
    });

    it('creates envio_eventos with correct fields including normalized estado', async () => {
      setupGuia('en_transito');
      const fecha = new Date('2026-01-15T10:00:00.000Z');

      await service.registrarEventoPorGuia('TRK001', 'En camino', 'in_transit', fecha);

      expect(mockPrisma.envio_eventos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numero_guia: 'TRK001',
            descripcion: 'En camino',
            estado_paqueteria: 'in_transit',
            estado_normalizado: 'en_transito',
            origen: 'webhook',
            fecha_evento: fecha,
          }),
        }),
      );
    });

    it('defaults fecha_evento to approximately now when not provided', async () => {
      setupGuia();
      const before = Date.now();
      await service.registrarEventoPorGuia('TRK001', 'Evento', 'in_transit');
      const after = Date.now();

      const call = mockPrisma.envio_eventos.create.mock.calls[0][0];
      const fechaEvento: Date = call.data.fecha_evento;
      expect(fechaEvento.getTime()).toBeGreaterThanOrEqual(before);
      expect(fechaEvento.getTime()).toBeLessThanOrEqual(after);
    });

    it('serializes BigInt id_envio via serializeBigInts (string) in return value', async () => {
      setupGuia('entregado');
      const result = await service.registrarEventoPorGuia('TRK001', 'Entregado', 'delivered');
      // serializeBigInts uses BigInt.toString() → string '1', not number
      expect(String(result.id_envio)).toBe('1');
      expect(result.numero_guia).toBe('TRK001');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('getTracking', () => {
    it('throws NotFoundException when envío not found', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue(null);
      await expect(service.getTracking('1')).rejects.toThrow(NotFoundException);
    });

    it('returns normalized carrier events when skydropx getTracking responds', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        numero_rastreo: 'TRK123',
        transportistas: { codigo: 'SKYDROPX' },
        envio_guias: [{ payload_response: { carrierName: 'DHL' }, envio_eventos: [] }],
      });
      mockSkydropx.getTracking.mockResolvedValue([
        { descripcion: 'En tránsito', estado: 'in_transit', fecha: new Date(), ubicacion: 'CDMX' },
      ]);

      const result = await service.getTracking('1');

      expect(result.eventos).toHaveLength(1);
      expect(result.eventos[0].estado).toBe('en_transito');
      expect(result.eventos[0].descripcion).toBe('En tránsito');
    });

    it('falls back to DB envio_eventos when carrier API throws', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        numero_rastreo: 'TRK123',
        transportistas: null,
        envio_guias: [{
          payload_response: null,
          envio_eventos: [
            {
              descripcion: 'Recogido por carrier',
              estado_normalizado: 'recogido',
              estado_paqueteria: 'collected',
              fecha_evento: new Date('2026-01-10T12:00:00.000Z'),
              ubicacion: 'Oaxaca',
            },
          ],
        }],
      });
      mockSkydropx.getTracking.mockRejectedValue(new Error('API unavailable'));

      const result = await service.getTracking('1');

      expect(result.eventos).toHaveLength(1);
      expect(result.eventos[0].descripcion).toBe('Recogido por carrier');
    });

    it('falls back to DB when carrier returns empty array', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        numero_rastreo: 'TRK123',
        transportistas: null,
        envio_guias: [{
          payload_response: null,
          envio_eventos: [
            {
              descripcion: 'Preparando envío',
              estado_normalizado: 'preparando',
              estado_paqueteria: 'pending',
              fecha_evento: new Date(),
              ubicacion: '',
            },
          ],
        }],
      });
      mockSkydropx.getTracking.mockResolvedValue([]);

      const result = await service.getTracking('1');

      expect(result.eventos).toHaveLength(1);
    });

    it('returns empty eventos when no numero_rastreo and no DB events', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        numero_rastreo: null,
        envio_guias: [],
      });

      const result = await service.getTracking('1');

      expect(result.eventos).toEqual([]);
      expect(mockSkydropx.getTracking).not.toHaveBeenCalled();
    });

    it('includes numero_rastreo and estado_actual in result', async () => {
      mockPrisma.envios.findUnique.mockResolvedValue({
        ...makeEnvio(),
        numero_rastreo: 'TRK999',
        estado: 'en_transito',
        transportistas: null,
        envio_guias: [],
      });
      mockSkydropx.getTracking.mockRejectedValue(new Error('skip'));

      const result = await service.getTracking('1');

      expect(result.numero_rastreo).toBe('TRK999');
      expect(result.estado_actual).toBe('en_transito');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('crearEnviosPorProductor', () => {
    it('returns [] when no pedido_productor rows exist', async () => {
      mockPrisma.pedido_productor.findMany.mockResolvedValue([]);
      const result = await service.crearEnviosPorProductor(1);
      expect(result).toEqual([]);
    });

    it('skips producers that already have id_envio assigned', async () => {
      mockPrisma.pedido_productor.findMany.mockResolvedValue([{
        id_productor: 1,
        id_envio: BigInt(99),
        productores: { nombre_marca: 'P1', direccion_bodega: null },
      }]);

      const result = await service.crearEnviosPorProductor(1);

      expect(result).toHaveLength(1);
      expect(result[0].skipped).toBe(true);
      expect(result[0].id_envio).toBe(99);
      expect(mockPrisma.envios.create).not.toHaveBeenCalled();
    });

    it('creates envio and calls crearGuia for each producer without id_envio', async () => {
      mockPrisma.pedido_productor.findMany.mockResolvedValue([{
        id_productor: 1,
        id_envio: null,
        productores: { nombre_marca: 'P1', direccion_bodega: null },
      }]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        id_productor: 1,
        cantidad: 1,
        productos: { nombre: 'P', peso_kg: '1', largo_cm: '10', ancho_cm: '10', alto_cm: '10', requiere_firma_adulto: false, requiere_edad_minima: 0 },
      }]);
      mockPrisma.envios.create.mockResolvedValue({ id_envio: BigInt(10) });
      mockPrisma.pedido_productor.updateMany.mockResolvedValue({ count: 1 });

      const crearGuiaSpy = jest.spyOn(service, 'crearGuia').mockResolvedValue({ tiene_pdf: true, numero_guia: 'TRK111' } as any);

      const result = await service.crearEnviosPorProductor(1);

      expect(result).toHaveLength(1);
      expect(result[0].id_envio).toBe(10);
      expect(result[0].guia).toBeDefined();
      expect(crearGuiaSpy).toHaveBeenCalledWith('10');

      crearGuiaSpy.mockRestore();
    });

    it('returns error entry for a producer when crearGuia fails without failing others', async () => {
      mockPrisma.pedido_productor.findMany.mockResolvedValue([
        { id_productor: 1, id_envio: null, productores: { nombre_marca: 'P1', direccion_bodega: null } },
        { id_productor: 2, id_envio: null, productores: { nombre_marca: 'P2', direccion_bodega: null } },
      ]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        id_productor: 1,
        cantidad: 1,
        productos: { nombre: 'P', peso_kg: '1', largo_cm: '10', ancho_cm: '10', alto_cm: '10', requiere_firma_adulto: false, requiere_edad_minima: 0 },
      }]);
      mockPrisma.envios.create
        .mockResolvedValueOnce({ id_envio: BigInt(10) })
        .mockResolvedValueOnce({ id_envio: BigInt(11) });
      mockPrisma.pedido_productor.updateMany.mockResolvedValue({ count: 1 });

      const crearGuiaSpy = jest.spyOn(service, 'crearGuia')
        .mockResolvedValueOnce({ tiene_pdf: true, numero_guia: 'TRK1' } as any)
        .mockRejectedValueOnce(new Error('Carrier timeout'));

      const result = await service.crearEnviosPorProductor(1);

      expect(result).toHaveLength(2);
      const succeeded = result.find(r => r.id_productor === 1 && !r.error);
      const failed = result.find(r => r.id_productor === 2 && r.error);
      expect(succeeded).toBeDefined();
      expect(failed?.error).toBe('Carrier timeout');

      crearGuiaSpy.mockRestore();
    });

    it('calculates chargeable weight as max(real, volumetric) per producer group', async () => {
      // qty=2, peso=1 → real=2; dims 10×10, alto=5×2=10 → vol=(10×10×10)/5000=0.2 → real wins
      mockPrisma.pedido_productor.findMany.mockResolvedValue([{
        id_productor: 1,
        id_envio: null,
        productores: { nombre_marca: 'P1', direccion_bodega: null },
      }]);
      mockPrisma.detalle_pedido.findMany.mockResolvedValue([{
        id_productor: 1,
        cantidad: 2,
        productos: { nombre: 'P', peso_kg: '1', largo_cm: '10', ancho_cm: '10', alto_cm: '5', requiere_firma_adulto: false, requiere_edad_minima: 0 },
      }]);
      mockPrisma.envios.create.mockResolvedValue({ id_envio: BigInt(10) });
      mockPrisma.pedido_productor.updateMany.mockResolvedValue({ count: 1 });

      jest.spyOn(service, 'crearGuia').mockResolvedValue({ tiene_pdf: true } as any);

      await service.crearEnviosPorProductor(1);

      expect(mockPrisma.envios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ peso_kg: '2.000' }),
        }),
      );

      jest.restoreAllMocks();
    });
  });
});

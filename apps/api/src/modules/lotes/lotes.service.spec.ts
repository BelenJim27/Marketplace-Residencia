import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LotesService } from './lotes.service';
import { PrismaService } from '../../prisma/prisma.service';

const API_TRAZABILIDAD = 'https://geoportal-trazabilidad-1.onrender.com/lotes/publico';

const mockPrisma: any = {
  lotes: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  tiendas: {
    findFirst: jest.fn(),
  },
  productos: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  categorias: {
    findFirst: jest.fn(),
  },
  categorias_productos: {
    upsert: jest.fn(),
  },
  inventario: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockLoteCreado = {
  id_lote: 1,
  id_productor: 1,
  codigo_lote: 'FOLIO-001',
  marca: 'Mezcal Artesanal',
  grado_alcohol: 45,
  unidades: 100,
  botellas_350ml: null,
  botellas_750ml: 100,
  datos_api: {},
  creado_en: new Date(),
  actualizado_en: new Date(),
  eliminado_en: null,
};

const mockTienda = {
  id_tienda: 1,
  id_productor: 1,
  nombre: 'Mezcal Artesanal',
  status: 'activa',
};

const mockProductoCreado = {
  id_producto: 100n,
  id_tienda: 1,
  id_lote: 1,
  nombre: 'Mezcal Test',
  precio_base: '0',
  status: 'activo',
  botellas_350ml: null,
  botellas_750ml: 100,
  metadata: {},
};

describe('LotesService — capacidad_ml mapping', () => {
  let service: LotesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [LotesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = moduleRef.get(LotesService);
  });

  describe('sincronizarDesdeApi — mapeo de capacidad_ml a botellas', () => {
    // Mock global.fetch to simulate the external traceability API
    function mockFetch(data: any) {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(data),
      });
    }

    beforeEach(() => {
      mockPrisma.tiendas.findFirst.mockResolvedValue(mockTienda);
      mockPrisma.lotes.findFirst.mockResolvedValue(null);
      mockPrisma.lotes.create.mockResolvedValue(mockLoteCreado);
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(mockProductoCreado);
      mockPrisma.categorias.findFirst.mockResolvedValue(null);
    });

    it('mapea unidades a botellas_750ml cuando capacidad_ml = 750', async () => {
      mockFetch({
        folio: 'FOLIO-001',
        marca: 'Mezcal Artesanal',
        capacidad_ml: 750,
        unidades: 50,
        grado_alcohol: 45,
        recolecciones: [{ especie: { nombre_comun: 'Espadín' } }],
      });

      await service.sincronizarDesdeApi('FOLIO-001', 1, 1);

      const productoData = mockPrisma.productos.create.mock.calls[0][0].data;
      expect(productoData.botellas_750ml).toBe(50);
      expect(productoData.botellas_350ml).toBe(0);
    });

    it('mapea unidades a botellas_350ml cuando capacidad_ml = 350', async () => {
      mockFetch({
        folio: 'FOLIO-002',
        marca: 'Mezcal Artesanal',
        capacidad_ml: 350,
        unidades: 80,
        grado_alcohol: 40,
        recolecciones: [{ especie: { nombre_comun: 'Tobalá' } }],
      });

      await service.sincronizarDesdeApi('FOLIO-002', 1, 1);

      const productoData = mockPrisma.productos.create.mock.calls[0][0].data;
      expect(productoData.botellas_350ml).toBe(80);
      expect(productoData.botellas_750ml).toBe(0);
    });

    it('usa botellas_350ml/botellas_750ml directos cuando no hay capacidad_ml', async () => {
      mockFetch({
        folio: 'FOLIO-003',
        marca: 'Mezcal Artesanal',
        unidades: 100,
        botellas_350ml: 30,
        botellas_750ml: 70,
        grado_alcohol: 42,
        recolecciones: [{ especie: { nombre_comun: 'Espadín' } }],
      });

      await service.sincronizarDesdeApi('FOLIO-003', 1, 1);

      const productoData = mockPrisma.productos.create.mock.calls[0][0].data;
      expect(productoData.botellas_350ml).toBe(30);
      expect(productoData.botellas_750ml).toBe(70);
    });

    it('no asigna unidades a botellas cuando capacidad_ml no es 350 ni 750', async () => {
      mockFetch({
        folio: 'FOLIO-004',
        marca: 'Mezcal Artesanal',
        capacidad_ml: 500,
        unidades: 60,
        botellas_350ml: 20,
        botellas_750ml: 40,
        grado_alcohol: 44,
        recolecciones: [{ especie: { nombre_comun: 'Espadín' } }],
      });

      await service.sincronizarDesdeApi('FOLIO-004', 1, 1);

      const productoData = mockPrisma.productos.create.mock.calls[0][0].data;
      // capacidad_ml=500 no es 350 ni 750, así que unidades no se mapean
      // Se usan los valores directos de botellas_350ml y botellas_750ml
      expect(productoData.botellas_350ml).toBe(20);
      expect(productoData.botellas_750ml).toBe(40);
    });

    it('guarda capacidad_ml en metadata del producto', async () => {
      mockFetch({
        folio: 'FOLIO-005',
        marca: 'Mezcal Artesanal',
        capacidad_ml: 750,
        unidades: 100,
        grado_alcohol: 45,
        recolecciones: [{ especie: { nombre_comun: 'Espadín' } }],
      });

      await service.sincronizarDesdeApi('FOLIO-005', 1, 1);

      const metadata = mockPrisma.productos.create.mock.calls[0][0].data.metadata;
      expect(metadata.capacidad_ml).toBe(750);
    });

    it('rechaza cuando la marca no coincide con ninguna tienda activa', async () => {
      mockFetch({
        folio: 'FOLIO-006',
        marca: 'Marca Desconocida',
        capacidad_ml: 750,
        unidades: 100,
      });

      mockPrisma.tiendas.findFirst.mockResolvedValue(null);

      const result = await service.sincronizarDesdeApi('FOLIO-006', 1, 1);
      expect(result).toBeNull();
      expect(mockPrisma.productos.create).not.toHaveBeenCalled();
    });
  });

  describe('create — datos básicos', () => {
    it('crea lote con datos mínimos', async () => {
      mockPrisma.lotes.create.mockResolvedValue(mockLoteCreado);

      const dto: any = {
        id_productor: 1,
        codigo_lote: 'LOTE-001',
        unidades: 100,
      };

      await service.create(dto);

      const loteData = mockPrisma.lotes.create.mock.calls[0][0].data;
      expect(loteData.codigo_lote).toBe('LOTE-001');
      expect(loteData.unidades).toBe(100);
    });
  });
});

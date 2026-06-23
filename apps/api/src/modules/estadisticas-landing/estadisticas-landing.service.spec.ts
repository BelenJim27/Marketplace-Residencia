import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EstadisticasLandingService,
  MAX_TOP_PRODUCTOS,
} from './estadisticas-landing.service';

describe('EstadisticasLandingService', () => {
  const prisma = {
    detalle_pedido: { groupBy: jest.fn() },
    productos: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  let service: EstadisticasLandingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EstadisticasLandingService(prisma as unknown as PrismaService);
  });

  it('conserva el orden del agregado y convierte BigInt', async () => {
    prisma.detalle_pedido.groupBy.mockResolvedValue([
      { id_producto: 20n, _sum: { cantidad: 9 } },
      { id_producto: 10n, _sum: { cantidad: 4 } },
    ]);
    prisma.productos.findMany.mockResolvedValue([
      { id_producto: 10n, nombre: 'Espadín', descripcion: null, imagen_principal_url: null },
      { id_producto: 20n, nombre: 'Tobalá', descripcion: 'Silvestre', imagen_principal_url: '/tobala.webp' },
    ]);

    await expect(service.getTopProductos(2)).resolves.toEqual([
      { id: 20, nombre: 'Tobalá', descripcion: 'Silvestre', imagen: '/tobala.webp', cantidad: 9 },
      { id: 10, nombre: 'Espadín', descripcion: '', imagen: '', cantidad: 4 },
    ]);
  });

  it('rellena posiciones sin ventas con productos activos', async () => {
    prisma.detalle_pedido.groupBy.mockResolvedValue([]);
    prisma.productos.findMany.mockResolvedValue([
      { id_producto: 30n, nombre: 'Cuishe', descripcion: null, imagen_principal_url: null },
    ]);

    await expect(service.getTopProductos(1)).resolves.toEqual([
      { id: 30, nombre: 'Cuishe', descripcion: '', imagen: '', cantidad: 0 },
    ]);
  });

  it('rechaza límites inválidos y limita valores excesivos', async () => {
    await expect(service.getTopProductos(0)).rejects.toBeInstanceOf(BadRequestException);
    prisma.detalle_pedido.groupBy.mockResolvedValue([]);
    prisma.productos.findMany.mockResolvedValue([]);

    await service.getTopProductos(MAX_TOP_PRODUCTOS + 1);

    expect(prisma.detalle_pedido.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_TOP_PRODUCTOS }),
    );
  });

  it('normaliza productos con lote obtenidos en una sola consulta', async () => {
    prisma.$queryRaw.mockResolvedValue([{
      nombre: 'Tobalá',
      imagen: null,
      descripcion: null,
      cantidad: 7,
      codigo_lote: 'LOTE-7',
      nombre_comun: 'Tobalá',
      nombre_cientifico: null,
      grado_alcohol: '45.5',
      unidades: 12,
      botellas_750ml: 10,
      fecha_produccion: new Date('2026-01-01'),
      sitio: 'Oaxaca',
      url_trazabilidad: null,
      url_foto_especie: null,
      productor: 'Maestra Mezcalera',
      region: 'Sierra Sur',
    }]);

    await expect(service.getTopProductosConLote(1)).resolves.toEqual([
      expect.objectContaining({
        nombre: 'Tobalá',
        cantidad: 7,
        lote: expect.objectContaining({
          codigo_lote: 'LOTE-7',
          productor: 'Maestra Mezcalera',
          region: 'Sierra Sur',
        }),
      }),
    ]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('normaliza la fila agregada de estadísticas', async () => {
    prisma.$queryRaw.mockResolvedValue([{
      totalProductores: 10n,
      totalProductos: 20n,
      totalRegiones: 8n,
      ingresosTotales: '1250',
    }]);

    await expect(service.getEstadisticasPublicas()).resolves.toEqual({
      totalProductores: 10,
      totalProductos: 20,
      totalRegiones: 8,
      ingresosTotales: 1250,
      ingresosFormateado: '$1.3 K',
    });
  });
});

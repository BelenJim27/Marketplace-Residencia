import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductosService, RequestUser } from './productos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from './dto/productos.dto';

const mockPrisma: any = {
  productos: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  tiendas: {
    findUnique: jest.fn(),
  },
  auditoria: {
    create: jest.fn().mockResolvedValue({}),
  },
};

const productorDueno: RequestUser = { id_usuario: 'u1', id_productor: 1, roles: ['productor'] };
const productorAjeno: RequestUser = { id_usuario: 'u2', id_productor: 2, roles: ['productor'] };
const admin: RequestUser = { id_usuario: 'u3', id_productor: null, roles: ['administrador'] };

describe('ProductosService — aislamiento multiproductor (BOLA)', () => {
  let service: ProductosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ProductosService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = moduleRef.get(ProductosService);
  });

  describe('update', () => {
    it('rechaza con 403 cuando un productor edita el producto de otro', async () => {
      mockPrisma.productos.findUnique.mockResolvedValue({
        id_producto: 10n, eliminado_en: null, tiendas: { id_productor: 1 }, lotes: null,
      });
      await expect(service.update('10', { nombre: 'hack' }, productorAjeno)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.productos.update).not.toHaveBeenCalled();
    });

    it('permite al productor dueño editar su producto', async () => {
      mockPrisma.productos.findUnique.mockResolvedValue({
        id_producto: 10n, eliminado_en: null, nombre: 'old', precio_base: '100', status: 'activo',
        tiendas: { id_productor: 1 }, lotes: null,
      });
      mockPrisma.productos.update.mockResolvedValue({ id_producto: 10n, nombre: 'nuevo' });
      await service.update('10', { nombre: 'nuevo' }, productorDueno);
      expect(mockPrisma.productos.update).toHaveBeenCalled();
    });

    it('permite al admin editar cualquier producto', async () => {
      mockPrisma.productos.findUnique.mockResolvedValue({
        id_producto: 10n, eliminado_en: null, nombre: 'old', precio_base: '100', status: 'activo',
        tiendas: { id_productor: 1 }, lotes: null,
      });
      mockPrisma.productos.update.mockResolvedValue({ id_producto: 10n });
      await service.update('10', { nombre: 'admin-edit' }, admin);
      expect(mockPrisma.productos.update).toHaveBeenCalled();
    });

    it('lanza 404 si el producto no existe', async () => {
      mockPrisma.productos.findUnique.mockResolvedValue(null);
      await expect(service.update('999', { nombre: 'x' }, admin)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('rechaza con 403 cuando un productor elimina el producto de otro', async () => {
      mockPrisma.productos.findUnique.mockResolvedValue({
        id_producto: 10n, eliminado_en: null, tiendas: { id_productor: 1 }, lotes: null,
      });
      await expect(service.remove('10', productorAjeno)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.productos.update).not.toHaveBeenCalled();
    });

    it('permite al productor dueño eliminar su producto (soft delete)', async () => {
      mockPrisma.productos.findUnique.mockResolvedValue({
        id_producto: 10n, eliminado_en: null, nombre: 'p', status: 'activo', tiendas: { id_productor: 1 }, lotes: null,
      });
      mockPrisma.productos.update.mockResolvedValue({ id_producto: 10n, eliminado_en: new Date() });
      await service.remove('10', productorDueno);
      expect(mockPrisma.productos.update).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('rechaza con 403 cuando un productor crea en una tienda ajena', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      const dto: any = { id_tienda: 5, nombre: 'x', precio_base: 100, status: 'borrador' };
      await expect(service.create(dto, productorAjeno)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

describe('CreateProductoDto — validación de montos (C-2)', () => {
  const base = { id_tienda: 1, nombre: 'Mezcal', status: 'borrador' };

  it('rechaza precio_base negativo', async () => {
    const dto = plainToInstance(CreateProductoDto, { ...base, precio_base: '-5' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'precio_base')).toBe(true);
  });

  it('rechaza precio_base cero', async () => {
    const dto = plainToInstance(CreateProductoDto, { ...base, precio_base: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'precio_base')).toBe(true);
  });

  it('acepta precio_base positivo', async () => {
    const dto = plainToInstance(CreateProductoDto, { ...base, precio_base: '199.99' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'precio_base')).toBe(false);
  });
});

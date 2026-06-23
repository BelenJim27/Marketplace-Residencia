import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductosService, RequestUser } from './productos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductoDto } from './dto/productos.dto';

const mockPrisma: any = {
  productos: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tiendas: {
    findUnique: jest.fn(),
  },
  categorias_productos: {
    create: jest.fn().mockResolvedValue({}),
  },
  producto_imagenes: {
    create: jest.fn().mockResolvedValue({}),
  },
  auditoria: {
    create: jest.fn().mockResolvedValue({}),
  },
};

const productorDueno: RequestUser = { id_usuario: 'u1', id_productor: 1, roles: ['productor'] };
const productorAjeno: RequestUser = { id_usuario: 'u2', id_productor: 2, roles: ['productor'] };
const admin: RequestUser = { id_usuario: 'u3', id_productor: null, roles: ['administrador'] };

const productoEjemplo = {
  id_producto: 100n,
  id_tienda: 1,
  id_lote: null,
  nombre: 'Mezcal Test',
  descripcion: null,
  traducciones: {},
  precio_base: '199.99',
  moneda_base: 'MXN',
  metadata: {},
  peso_kg: null,
  alto_cm: null,
  ancho_cm: null,
  largo_cm: null,
  status: 'borrador',
  botellas_350ml: null,
  botellas_750ml: null,
  creado_por: null,
  actualizado_por: null,
  imagen_principal_url: null,
  tiendas: { id_tienda: 1, nombre: 'Tienda Test' },
  categorias_productos: [],
  producto_imagenes: [],
};

describe('ProductosService — aislamiento multiproductor (BOLA)', () => {
  let service: ProductosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ProductosService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = moduleRef.get(ProductosService);
  });

  describe('findOne', () => {
    it('devuelve botellas, peso y dimensiones registrados para gestionar el producto', async () => {
      mockPrisma.productos.findUnique.mockResolvedValue({
        ...productoEjemplo,
        eliminado_en: null,
        peso_kg: '1.250',
        alto_cm: '30.00',
        ancho_cm: '20.00',
        largo_cm: '40.00',
        botellas_350ml: 0,
        botellas_750ml: 24,
        inventario: [{ stock: 24, stock_minimo: 2 }],
      });

      const result = await service.findOne('100');

      expect(result).toEqual(expect.objectContaining({
        peso_kg: '1.250',
        alto_cm: '30.00',
        ancho_cm: '20.00',
        largo_cm: '40.00',
        botellas_350ml: 0,
        botellas_750ml: 24,
      }));
    });
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
    const dtoBase = { id_tienda: 1, nombre: 'Mezcal Test', precio_base: 199.99, status: 'borrador' };

    it('rechaza con 403 cuando un productor crea en una tienda ajena', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      const dto: any = { ...dtoBase };
      await expect(service.create(dto, productorAjeno)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza con 404 si la tienda no existe', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue(null);
      const dto: any = { ...dtoBase };
      await expect(service.create(dto, productorDueno)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('permite al admin crear en cualquier tienda sin verificar titularidad', async () => {
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(productoEjemplo);

      const dto: any = { ...dtoBase, status: 'borrador' };
      const result = await service.create(dto, admin);
      expect(mockPrisma.tiendas.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.productos.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('rechaza lote duplicado', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue({ id_producto: 99n });

      const dto: any = { ...dtoBase, id_lote: 5 };
      await expect(service.create(dto, productorDueno)).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.productos.create).not.toHaveBeenCalled();
    });

    it('rechaza dimensiones faltantes con status activo', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);

      const dto: any = { ...dtoBase, status: 'activo', peso_kg: 0, alto_cm: 0, ancho_cm: 0, largo_cm: 0 };
      await expect(service.create(dto, productorDueno)).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.productos.create).not.toHaveBeenCalled();
    });

    it('rechaza dimensiones parciales con status activo', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);

      const dto: any = { ...dtoBase, status: 'activo', peso_kg: 1.5, alto_cm: 10, ancho_cm: 0, largo_cm: 20 };
      await expect(service.create(dto, productorDueno)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('acepta dimensiones válidas con status activo', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(productoEjemplo);

      const dto: any = { ...dtoBase, status: 'activo', peso_kg: 1.5, alto_cm: 30, ancho_cm: 20, largo_cm: 40 };
      const result = await service.create(dto, productorDueno);
      expect(mockPrisma.productos.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('no valida dimensiones con status borrador', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(productoEjemplo);

      const dto: any = { ...dtoBase, status: 'borrador' };
      await service.create(dto, productorDueno);
      expect(mockPrisma.productos.create).toHaveBeenCalled();
    });

    it('guarda botellas_350ml y botellas_750ml correctamente', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue({ ...productoEjemplo, botellas_350ml: 10, botellas_750ml: 5 });

      const dto: any = { ...dtoBase, botellas_350ml: 10, botellas_750ml: 5 };
      await service.create(dto, productorDueno);
      expect(Number(mockPrisma.productos.create.mock.calls[0][0].data.botellas_350ml)).toBe(10);
      expect(Number(mockPrisma.productos.create.mock.calls[0][0].data.botellas_750ml)).toBe(5);
    });

    it('guarda dimensiones como Prisma.Decimal', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(productoEjemplo);

      const dto: any = { ...dtoBase, status: 'borrador', peso_kg: 2.5, alto_cm: 30, ancho_cm: 20, largo_cm: 40 };
      await service.create(dto, productorDueno);

      const data = mockPrisma.productos.create.mock.calls[0][0].data;
      expect(data.peso_kg).toBeDefined();
      expect(Number(data.peso_kg)).toBe(2.5);
      expect(Number(data.alto_cm)).toBe(30);
      expect(Number(data.ancho_cm)).toBe(20);
      expect(Number(data.largo_cm)).toBe(40);
    });

    it('asigna categorías desde array e id_categoria', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(productoEjemplo);

      const dto: any = { ...dtoBase, categorias: [1, 2], id_categoria: '3' };
      await service.create(dto, productorDueno);

      const assigned = mockPrisma.categorias_productos.create.mock.calls.map((c: any) => c[0].data.id_categoria);
      expect(assigned).toContain(1);
      expect(assigned).toContain(2);
      expect(assigned).toContain(3);
      expect(mockPrisma.categorias_productos.create).toHaveBeenCalledTimes(3);
    });

    it('registra auditoría al crear producto', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(productoEjemplo);

      const dto: any = { ...dtoBase };
      await service.create(dto, productorDueno);

      expect(mockPrisma.auditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'crear_producto',
            tabla_afectada: 'productos',
          }),
        }),
      );
    });

    it('crea imágenes adicionales cuando se proporcionan', async () => {
      mockPrisma.tiendas.findUnique.mockResolvedValue({ id_productor: 1 });
      mockPrisma.productos.findFirst.mockResolvedValue(null);
      mockPrisma.productos.create.mockResolvedValue(productoEjemplo);

      const dto: any = {
        ...dtoBase,
        imagenes: [
          { url: 'https://ejemplo.com/img1.jpg', orden: 0, es_principal: true },
          { url: 'https://ejemplo.com/img2.jpg', orden: 1 },
        ],
      };
      await service.create(dto, productorDueno);

      expect(mockPrisma.producto_imagenes.create).toHaveBeenCalledTimes(2);
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

  describe('dimensiones', () => {
    it('rechaza peso_kg negativo', async () => {
      const dto = plainToInstance(CreateProductoDto, { ...base, peso_kg: '-1' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'peso_kg')).toBe(true);
    });

    it('acepta peso_kg cero (opcional)', async () => {
      const dto = plainToInstance(CreateProductoDto, { ...base, peso_kg: '0' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'peso_kg')).toBe(false);
    });

    it('acepta dimensiones positivas', async () => {
      const dto = plainToInstance(CreateProductoDto, {
        ...base, peso_kg: '1.5', alto_cm: '30', ancho_cm: '20', largo_cm: '40',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => ['peso_kg', 'alto_cm', 'ancho_cm', 'largo_cm'].includes(e.property))).toBe(false);
    });
  });

  describe('botellas', () => {
    it('rechaza botellas_350ml negativo', async () => {
      const dto = plainToInstance(CreateProductoDto, { ...base, botellas_350ml: '-1' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'botellas_350ml')).toBe(true);
    });

    it('acepta botellas_350ml cero', async () => {
      const dto = plainToInstance(CreateProductoDto, { ...base, botellas_350ml: '0' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'botellas_350ml')).toBe(false);
    });
  });
});

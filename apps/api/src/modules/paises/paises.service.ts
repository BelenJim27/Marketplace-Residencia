import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreatePaisDto, ListPaisesQueryDto, UpdatePaisDto } from './dto/paises.dto';

@Injectable()
export class PaisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListPaisesQueryDto = {}) {
    // ✅ Prisma genera el tipo como Parameters<typeof prisma.paises.findMany>[0]['where']
    // que es equivalente pero siempre coincide con el schema real
    const where: Prisma.paisesWhereInput = {};
    if (typeof query.activo_venta === 'boolean') where!.activo_venta = query.activo_venta;
    if (typeof query.activo_envio === 'boolean') where!.activo_envio = query.activo_envio;
    return serializeBigInts(
      await this.prisma.paises.findMany({ where, orderBy: { nombre: 'asc' } }),
    );
  }

  async findOne(iso2: string) {
    const pais = await this.prisma.paises.findUnique({
      where: { iso2: iso2.toUpperCase() },
      include: { monedas: true, idiomas: true },
    });
    if (!pais) throw new NotFoundException('País no encontrado');
    return serializeBigInts(pais);
  }

  async create(dto: CreatePaisDto) {
    try {
      return serializeBigInts(
        await this.prisma.paises.create({
          data: {
            iso2: dto.iso2.toUpperCase(),
            iso3: dto.iso3.toUpperCase(),
            nombre: dto.nombre.trim(),
            nombre_local: dto.nombre_local?.trim(),
            moneda_default: dto.moneda_default.toUpperCase(),
            idioma_default: dto.idioma_default?.trim() ?? 'es',
            prefijo_telefono: dto.prefijo_telefono?.trim(),
            activo_venta: dto.activo_venta ?? false,
            activo_envio: dto.activo_envio ?? false,
          },
        }),
      );
    } catch (error) {
      // ✅ Mismo patrón que los otros servicios
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('País ya existe');
      }
      throw error;
    }
  }

  async update(iso2: string, dto: UpdatePaisDto) {
    await this.ensureExists(iso2);
    return serializeBigInts(
      await this.prisma.paises.update({
        where: { iso2: iso2.toUpperCase() },
        data: {
          iso3: dto.iso3?.toUpperCase(),
          nombre: dto.nombre?.trim(),
          nombre_local: dto.nombre_local?.trim(),
          moneda_default: dto.moneda_default?.toUpperCase(),
          idioma_default: dto.idioma_default?.trim(),
          prefijo_telefono: dto.prefijo_telefono?.trim(),
          activo_venta: dto.activo_venta,
          activo_envio: dto.activo_envio,
        },
      }),
    );
  }

  async remove(iso2: string) {
    await this.ensureExists(iso2);
    await this.prisma.paises.delete({ where: { iso2: iso2.toUpperCase() } });
    return { message: 'País eliminado' };
  }

  private async ensureExists(iso2: string) {
    const pais = await this.prisma.paises.findUnique({ where: { iso2: iso2.toUpperCase() } });
    if (!pais) throw new NotFoundException('País no encontrado');
  }
}
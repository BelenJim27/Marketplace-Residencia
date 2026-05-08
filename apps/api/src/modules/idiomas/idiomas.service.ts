import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { CreateIdiomaDto, UpdateIdiomaDto } from './dto/idiomas.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class IdiomasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(soloActivos = false) {
    const where: Prisma.idiomasWhereInput = soloActivos ? { activo: true } : {};
    return serializeBigInts(
      await this.prisma.idiomas.findMany({ where, orderBy: { codigo: 'asc' } }),
    );
  }

  async findOne(codigo: string) {
    const item = await this.prisma.idiomas.findUnique({ where: { codigo } });
    if (!item) throw new NotFoundException('Idioma no encontrado');
    return serializeBigInts(item);
  }

  async create(dto: CreateIdiomaDto) {
    try {
      return serializeBigInts(
        await this.prisma.idiomas.create({
          data: {
            codigo: dto.codigo.trim(),
            nombre: dto.nombre.trim(),
            nombre_local: dto.nombre_local?.trim(),
            activo: dto.activo ?? true,
            rtl: dto.rtl ?? false,
          },
        }),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Idioma ya existe');
      }
      throw error;
    }
  }

  async update(codigo: string, dto: UpdateIdiomaDto) {
    await this.ensureExists(codigo);
    return serializeBigInts(
      await this.prisma.idiomas.update({
        where: { codigo },
        data: {
          nombre: dto.nombre?.trim(),
          nombre_local: dto.nombre_local?.trim(),
          activo: dto.activo,
          rtl: dto.rtl,
        },
      }),
    );
  }

  private async ensureExists(codigo: string) {
    const item = await this.prisma.idiomas.findUnique({ where: { codigo } });
    if (!item) throw new NotFoundException('Idioma no encontrado');
  }
}

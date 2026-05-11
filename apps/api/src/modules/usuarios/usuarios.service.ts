import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, usuarios } from '@prisma/client';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { AssignUsuarioRolDto, CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.usuarios.findMany({
      where: { eliminado_en: null },
      include: { usuario_rol: { include: { roles: true } } },
      orderBy: { fecha_registro: 'desc' },
    });
    return serializeBigInts(items);
  }

  async findOne(id_usuario: string) {
    const item = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      include: { usuario_rol: { include: { roles: true } } },
    });
    if (!item || item.eliminado_en) throw new NotFoundException('Usuario no encontrado');
    return serializeBigInts(item);
  }

  async create(dto: CreateUsuarioDto) {
    await this.ensureEmailAvailable(dto.email);

    const data = {
      nombre_usuario: dto.nombre_usuario.trim(),
      nombre: dto.nombre.trim(),
      email: dto.email.trim().toLowerCase(),
      password_hash: dto.password ? await hashPassword(dto.password) : null,
      apellido_paterno: dto.apellido_paterno?.trim() ?? null,
      apellido_materno: dto.apellido_materno?.trim() ?? null,
      telefono: dto.telefono?.trim() ?? null,
      foto_url: dto.foto_url?.trim() ?? null,
      idioma_preferido: dto.idioma_preferido?.trim() ?? 'es',
      moneda_preferida: dto.moneda_preferida?.trim() ?? 'MXN',
    };

    const user = await this.prisma.usuarios.create({ data });
    return serializeBigInts(user);
  }

  async update(id_usuario: string, dto: UpdateUsuarioDto) {
    const current = await this.prisma.usuarios.findUnique({ where: { id_usuario } });
    if (!current || current.eliminado_en) throw new NotFoundException('Usuario no encontrado');

    if (dto.email && dto.email.trim().toLowerCase() !== current.email) {
      await this.ensureEmailAvailable(dto.email);
    }

    const user = await this.prisma.usuarios.update({
      where: { id_usuario },
      data: clean({
        nombre: dto.nombre?.trim(),
        email: dto.email?.trim().toLowerCase(),
        password_hash: dto.password ? await hashPassword(dto.password) : undefined,
        apellido_paterno: dto.apellido_paterno?.trim(),
        apellido_materno: dto.apellido_materno?.trim(),
        telefono: dto.telefono?.trim(),
        biografia: dto.biografia?.trim(),
        foto_url: dto.foto_url?.trim(),
        idioma_preferido: dto.idioma_preferido?.trim(),
        moneda_preferida: dto.moneda_preferida?.trim(),
        fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : undefined,
      }),
    });

    return serializeBigInts(user);
  }

  async remove(id_usuario: string) {
    const current = await this.prisma.usuarios.findUnique({ where: { id_usuario } });
    if (!current || current.eliminado_en) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.usuarios.update({
      where: { id_usuario },
      data: {
        eliminado_en: new Date(),
        version_token: { increment: 1 },
      },
    });

    await this.prisma.refresh_tokens.updateMany({
      where: { id_usuario, revocado_en: null },
      data: { revocado_en: new Date() },
    });

    return serializeBigInts(updated);
  }

  async addRole(id_usuario: string, id_rol: number) {
    await this.ensureUserExists(id_usuario);

    // Verificar si el rol que se está asignando es "productor"
    const rol = await this.prisma.roles.findUnique({ where: { id_rol } });
    if (rol?.nombre === 'productor') {
      const pedidosComoCliente = await this.prisma.pedidos.count({
        where: { id_usuario, eliminado_en: null },
      });
      if (pedidosComoCliente > 0) {
        throw new BadRequestException(
          'No puedes convertirte en productor porque ya realizaste pedidos como cliente. Si deseas ser productor, crea una cuenta nueva.',
        );
      }
    }

    const relation = await this.prisma.usuario_rol.upsert({
      where: { id_usuario_id_rol: { id_usuario, id_rol } },
      create: { id_usuario, id_rol },
      update: { estado: 'activo' },
    });
    return serializeBigInts(relation);
  }

  async removeRole(id_usuario: string, id_rol: number) {
    // Verificar si el rol que se remueve es "productor"
    const rol = await this.prisma.roles.findUnique({ where: { id_rol } });

    await this.prisma.usuario_rol.delete({
      where: { id_usuario_id_rol: { id_usuario, id_rol } },
    });

    // Si era productor, marcar su registro como inactivo
    // Esto hace que el frontend limpie id_productor y oculte el panel
    if (rol?.nombre === 'productor') {
      await this.prisma.productores.updateMany({
        where: { id_usuario, eliminado_en: null },
        data: { estado: 'inactivo' },
      });
    }

    return { message: 'Rol removido del usuario' };
  }

  private async ensureUserExists(id_usuario: string) {
    const user = await this.prisma.usuarios.findUnique({ where: { id_usuario } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prisma.usuarios.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) throw new ConflictException('Email ya registrado');
  }
}

function clean<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$16384$8$1$${salt}$${Buffer.from(derivedKey).toString('hex')}$sha512`);
    });
  });
}
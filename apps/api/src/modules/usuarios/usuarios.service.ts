import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Moneda, Prisma, usuarios } from '@prisma/client';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginacionQueryDto } from '../../common/dto/paginacion.dto';
import { serializeBigInts } from '../../common/utilities/serialize';
import { deleteLocalUpload } from '../../common/utilities/local-upload';
import { AssignUsuarioRolDto, CreateUsuarioDto, UpdateUsuarioDto } from './dto/usuarios.dto';
import { SessionInvalidationService } from '../auth/session-invalidation.service';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionInvalidationService,
  ) {}

  async findAll(query: PaginacionQueryDto = {}) {
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;
    const skip = (pagina - 1) * limite;
    const where = { eliminado_en: null };
    const [items, total] = await Promise.all([
      this.prisma.usuarios.findMany({
        where,
        include: { usuario_rol: { include: { roles: true } } },
        orderBy: { fecha_registro: 'desc' },
        take: limite,
        skip,
      }),
      this.prisma.usuarios.count({ where }),
    ]);
    return serializeBigInts({ items, paginacion: { pagina, limite, total, paginas: Math.ceil(total / limite) } });
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
      moneda_preferida: (dto.moneda_preferida?.trim() ?? 'MXN') as Moneda,
    };

    const user = await this.prisma.usuarios.create({ data });

    if (dto.id_rol) {
      await this.prisma.usuario_rol.upsert({
        where: { id_usuario_id_rol: { id_usuario: user.id_usuario, id_rol: dto.id_rol } },
        create: { id_usuario: user.id_usuario, id_rol: dto.id_rol },
        update: { estado: 'activo' },
      });
    }

    await this.prisma.auditoria.create({
      data: {
        accion: 'crear_usuario',
        tabla_afectada: 'usuarios',
        registro_id: user.id_usuario,
        valor_nuevo: { email: user.email, nombre: user.nombre, id_rol: dto.id_rol ?? null } as any,
      },
    });
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
        moneda_preferida: dto.moneda_preferida?.trim() as Moneda | undefined,
        fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : undefined,
      }),
    });

    await this.prisma.auditoria.create({
      data: {
        id_usuario,
        accion: 'actualizar_usuario',
        tabla_afectada: 'usuarios',
        registro_id: id_usuario,
        valor_anterior: { nombre: current.nombre, email: current.email, telefono: current.telefono } as any,
        valor_nuevo: { nombre: dto.nombre, email: dto.email, telefono: dto.telefono } as any,
      },
    });

    if (dto.foto_url !== undefined && dto.foto_url !== current.foto_url) {
      await deleteLocalUpload(current.foto_url);
    }

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

    await this.prisma.auditoria.create({
      data: {
        accion: 'eliminar_usuario',
        tabla_afectada: 'usuarios',
        registro_id: id_usuario,
        valor_anterior: { nombre: current.nombre, email: current.email } as any,
      },
    });

    return serializeBigInts(updated);
  }

  async addRole(id_usuario: string, id_rol: number) {
    await this.ensureUserExists(id_usuario);

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

    const relation = await this.prisma.$transaction(async (tx) => {
      const assigned = await tx.usuario_rol.upsert({
        where: { id_usuario_id_rol: { id_usuario, id_rol } },
        create: { id_usuario, id_rol },
        update: { estado: 'activo' },
      });
      await tx.auditoria.create({
        data: {
          id_usuario,
          accion: 'asignar_rol',
          tabla_afectada: 'usuario_rol',
          registro_id: id_usuario,
          valor_nuevo: { id_rol, nombre_rol: rol?.nombre } as any,
        },
      });
      await this.sessions.invalidateUsers([id_usuario], tx);
      return assigned;
    });

    return serializeBigInts(relation);
  }

  async removeRole(id_usuario: string, id_rol: number) {
    const rol = await this.prisma.roles.findUnique({ where: { id_rol } });

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario_rol.delete({
        where: { id_usuario_id_rol: { id_usuario, id_rol } },
      });
      if (rol?.nombre === 'productor') {
        await tx.productores.updateMany({
          where: { id_usuario, eliminado_en: null },
          data: { estado: 'inactivo' },
        });
      }
      await tx.auditoria.create({
        data: {
          id_usuario,
          accion: 'quitar_rol',
          tabla_afectada: 'usuario_rol',
          registro_id: id_usuario,
          valor_anterior: { id_rol, nombre_rol: rol?.nombre } as any,
        },
      });
      await this.sessions.invalidateUsers([id_usuario], tx);
    });

    return { message: 'Rol removido del usuario' };
  }

  /**
   * CCPA / "right to know": exporta los datos personales del usuario (perfil,
   * direcciones y resumen de pedidos). Excluye password_hash.
   */
  async exportData(id_usuario: string) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      include: { usuario_rol: { include: { roles: true } } },
    });
    if (!usuario || usuario.eliminado_en) throw new NotFoundException('Usuario no encontrado');

    const { password_hash: _omit, ...perfil } = usuario as any;

    const [direcciones, pedidos] = await Promise.all([
      this.prisma.direcciones.findMany({ where: { id_usuario } }),
      this.prisma.pedidos.findMany({
        where: { id_usuario },
        select: { id_pedido: true, estado: true, total: true, moneda: true },
      }),
    ]);

    return serializeBigInts({
      exportado_en: new Date().toISOString(),
      perfil,
      direcciones,
      pedidos,
    });
  }

  /**
   * CCPA / "right to delete": desactiva la cuenta (soft delete) y revoca sesiones.
   * Los registros transaccionales (pedidos, pagos) se retienen por obligaciones
   * fiscales/contables; solo se inhabilita el acceso y el perfil deja de listarse.
   */
  async requestDeletion(id_usuario: string) {
    const current = await this.prisma.usuarios.findUnique({ where: { id_usuario } });
    if (!current || current.eliminado_en) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.usuarios.update({
      where: { id_usuario },
      data: { eliminado_en: new Date(), version_token: { increment: 1 } },
    });
    await this.prisma.refresh_tokens.updateMany({
      where: { id_usuario, revocado_en: null },
      data: { revocado_en: new Date() },
    });
    await this.prisma.auditoria.create({
      data: {
        id_usuario,
        accion: 'solicitud_borrado_ccpa',
        tabla_afectada: 'usuarios',
        registro_id: id_usuario,
        valor_anterior: { email: current.email } as any,
      },
    });

    return {
      message:
        'Tu cuenta fue desactivada y tus sesiones cerradas. Los registros de pedidos/pagos se conservan por obligaciones legales.',
    };
  }

  /**
   * CCPA "Do Not Sell My Personal Information": registra la solicitud en auditoría.
   * Guardians del Mezcal no vende datos a terceros, pero la CCPA requiere un canal formal
   * de opt-out. La solicitud queda registrada y se responde en 45 días.
   */
  async ccpaOptOut(email: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Email inválido');
    }
    const normalizedEmail = email.toLowerCase().trim();
    await this.prisma.auditoria.create({
      data: {
        accion: 'ccpa_opt_out_request',
        tabla_afectada: 'usuarios',
        registro_id: normalizedEmail,
        valor_nuevo: { email: normalizedEmail, timestamp: new Date().toISOString() } as any,
      },
    });
    return {
      message:
        'Your request has been received. We do not sell personal information. We will confirm within 45 days.',
    };
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

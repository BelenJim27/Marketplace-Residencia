import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../../common/utilities/serialize';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { SessionInvalidationService } from '../auth/session-invalidation.service';
import {
  AssignPermisoDto,
  CreatePermisoDto,
  CreateRolDto,
  UpdatePermisoDto,
  UpdateRolDto,
} from './dto/roles.dto';
import { isPermisoValido } from '../../common/permisos-catalog';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionInvalidationService,
  ) {}

  async findAll() {
    return serializeBigInts(await this.prisma.roles.findMany({ where: { eliminado_en: null }, include: { rol_permiso: { include: { permisos: true } } } }));
  }

  async findOne(id_rol: number) {
    const item = await this.prisma.roles.findUnique({ where: { id_rol }, include: { rol_permiso: { include: { permisos: true } } } });
    if (!item || item.eliminado_en) throw new NotFoundException('Rol no encontrado');
    return serializeBigInts(item);
  }

  async create(dto: CreateRolDto) {
    try {
      return serializeBigInts(await this.prisma.roles.create({ data: { nombre: dto.nombre.trim(), estado: dto.estado?.trim() ?? 'activo' } }));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002')
        throw error;
    }
  }

  async update(id_rol: number, dto: UpdateRolDto) {
    const current = await this.prisma.roles.findUnique({ where: { id_rol } });
    if (!current || current.eliminado_en) throw new NotFoundException('Rol no encontrado');
    const updated = await this.prisma.$transaction(async (tx) => {
      const role = await tx.roles.update({
        where: { id_rol },
        data: { nombre: dto.nombre?.trim(), estado: dto.estado?.trim() },
      });
      await this.sessions.invalidateUsersForRole(id_rol, tx);
      return role;
    });
    return serializeBigInts(updated);
  }

  async remove(id_rol: number) {
    const current = await this.prisma.roles.findUnique({ where: { id_rol } });
    if (!current || current.eliminado_en) throw new NotFoundException('Rol no encontrado');
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.roles.update({ where: { id_rol }, data: { eliminado_en: new Date() } });
      await this.sessions.invalidateUsersForRole(id_rol, tx);
      return updated;
    });
    return serializeBigInts(result);
  }

  async addPermiso(id_rol: number, id_permiso: number) {
    await this.ensureRole(id_rol);
    await this.ensurePermiso(id_permiso);
    const permiso = await this.prisma.permisos.findUnique({ where: { id_permiso } });
    if (permiso && !isPermisoValido(permiso.nombre)) {
      throw new ConflictException(`El permiso "${permiso.nombre}" no está en el catálogo válido`);
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const rp = await tx.rol_permiso.create({ data: { id_rol, id_permiso } });
      await this.sessions.invalidateUsersForRole(id_rol, tx);
      return rp;
    });
    return serializeBigInts(result);
  }

  async removePermisoFromRole(id_rol: number, id_permiso: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rol_permiso.delete({ where: { id_rol_id_permiso: { id_rol, id_permiso } } });
      await this.sessions.invalidateUsersForRole(id_rol, tx);
    });
    return { message: 'Permiso removido del rol' };
  }

  async findAllPermisos() {
    return serializeBigInts(await this.prisma.permisos.findMany({ where: { eliminado_en: null } }));
  }

  async findPermiso(id_permiso: number) {
    const item = await this.prisma.permisos.findUnique({ where: { id_permiso } });
    if (!item || item.eliminado_en) throw new NotFoundException('Permiso no encontrado');
    return serializeBigInts(item);
  }

  async createPermiso(dto: CreatePermisoDto) {
    throw new ConflictException(
      `El catálogo de permisos es administrado por el sistema; no se puede crear "${dto.nombre}" manualmente`,
    );
  }

  async updatePermiso(id_permiso: number, dto: UpdatePermisoDto) {
    const item = await this.prisma.permisos.findUnique({ where: { id_permiso } });
    if (!item || item.eliminado_en) throw new NotFoundException('Permiso no encontrado');
    throw new ConflictException(
      `El catálogo de permisos es administrado por el sistema; no se puede renombrar a "${dto.nombre ?? item.nombre}"`,
    );
  }

  async removePermiso(id_permiso: number) {
    const item = await this.prisma.permisos.findUnique({ where: { id_permiso } });
    if (!item || item.eliminado_en) throw new NotFoundException('Permiso no encontrado');
    throw new ConflictException(
      `El catálogo de permisos es administrado por el sistema; no se puede eliminar "${item.nombre}"`,
    );
  }

  async getPermisosByRole(id_rol: number) {
    const role = await this.prisma.roles.findUnique({
      where: { id_rol },
      include: { rol_permiso: { include: { permisos: true } } }
    });
    if (!role || role.eliminado_en) throw new NotFoundException('Rol no encontrado');
    return serializeBigInts(
      role.rol_permiso
        .map((rp: { permisos: { nombre: string } }) => rp.permisos?.nombre)
    );
  }

  private async ensureRole(id_rol: number) {
    const item = await this.prisma.roles.findUnique({ where: { id_rol } });
    if (!item || item.eliminado_en) throw new NotFoundException('Rol no encontrado');
  }

  private async ensurePermiso(id_permiso: number) {
    const item = await this.prisma.permisos.findUnique({ where: { id_permiso } });
    if (!item || item.eliminado_en) throw new NotFoundException('Permiso no encontrado');
  }

}

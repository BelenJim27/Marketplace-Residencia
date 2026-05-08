import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../shared/serialize';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  AssignPermisoDto,
  CreatePermisoDto,
  CreateRolDto,
  UpdatePermisoDto,
  UpdateRolDto,
} from './dto/roles.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) { }

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
    return serializeBigInts(await this.prisma.roles.update({ where: { id_rol }, data: { nombre: dto.nombre?.trim(), estado: dto.estado?.trim() } }));
  }

  async remove(id_rol: number) {
    return serializeBigInts(await this.prisma.roles.update({ where: { id_rol }, data: { eliminado_en: new Date() } }));
  }

  async addPermiso(id_rol: number, id_permiso: number) {
    await this.ensureRole(id_rol);
    await this.ensurePermiso(id_permiso);
    return serializeBigInts(await this.prisma.rol_permiso.create({ data: { id_rol, id_permiso } }));
  }

  async removePermisoFromRole(id_rol: number, id_permiso: number) {
    await this.prisma.rol_permiso.delete({ where: { id_rol_id_permiso: { id_rol, id_permiso } } });
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
    return serializeBigInts(await this.prisma.permisos.create({ data: { nombre: dto.nombre.trim() } }));
  }

  async updatePermiso(id_permiso: number, dto: UpdatePermisoDto) {
    const item = await this.prisma.permisos.findUnique({ where: { id_permiso } });
    if (!item || item.eliminado_en) throw new NotFoundException('Permiso no encontrado');
    return serializeBigInts(await this.prisma.permisos.update({ where: { id_permiso }, data: { nombre: dto.nombre?.trim() } }));
  }

  async removePermiso(id_permiso: number) {
    return serializeBigInts(await this.prisma.permisos.update({ where: { id_permiso }, data: { eliminado_en: new Date() } }));
  }

  private async ensureRole(id_rol: number) {
    const item = await this.prisma.roles.findUnique({ where: { id_rol } });
    if (!item || item.eliminado_en) throw new NotFoundException('Rol no encontrado');
  }

  private async ensurePermiso(id_permiso: number) {
    const item = await this.prisma.permisos.findUnique({ where: { id_permiso } });
    if (!item || item.eliminado_en) throw new NotFoundException('Permiso no encontrado');
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
}


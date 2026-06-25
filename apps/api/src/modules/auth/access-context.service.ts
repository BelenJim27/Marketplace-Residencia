import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessContext {
  id_usuario: string;
  email: string;
  version_token: number;
  roles: string[];
  permisos: string[];
  id_productor: number | null;
  profile: {
    nombre: string;
    apellido_paterno: string | null;
    apellido_materno: string | null;
    telefono: string | null;
    foto_url: string | null;
    idioma_preferido: string;
    moneda_preferida: string;
    fecha_registro: Date;
  };
}

@Injectable()
export class AccessContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(id_usuario: string): Promise<AccessContext | null> {
    const user = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      select: {
        id_usuario: true,
        email: true,
        nombre: true,
        apellido_paterno: true,
        apellido_materno: true,
        telefono: true,
        foto_url: true,
        idioma_preferido: true,
        moneda_preferida: true,
        fecha_registro: true,
        version_token: true,
        eliminado_en: true,
        productores: {
          select: { id_productor: true, estado: true, eliminado_en: true },
        },
        usuario_rol: {
          where: {
            estado: 'activo',
            roles: { estado: 'activo', eliminado_en: null },
          },
          select: {
            roles: {
              select: {
                nombre: true,
                rol_permiso: {
                  where: { permisos: { eliminado_en: null } },
                  select: { permisos: { select: { nombre: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.eliminado_en) return null;

    const roles = user.usuario_rol.map((relation) => relation.roles.nombre);
    const permisos = Array.from(
      new Set(
        user.usuario_rol.flatMap((relation) =>
          relation.roles.rol_permiso.map((assignment) => assignment.permisos.nombre),
        ),
      ),
    );
    const productor = user.productores;
    const idProductor =
      productor && productor.eliminado_en === null && productor.estado === 'aprobado'
        ? productor.id_productor
        : null;

    return {
      id_usuario: user.id_usuario,
      email: user.email,
      version_token: user.version_token,
      roles,
      permisos,
      id_productor: idProductor,
      profile: {
        nombre: user.nombre,
        apellido_paterno: user.apellido_paterno,
        apellido_materno: user.apellido_materno,
        telefono: user.telefono,
        foto_url: user.foto_url,
        idioma_preferido: user.idioma_preferido,
        moneda_preferida: user.moneda_preferida,
        fecha_registro: user.fecha_registro,
      },
    };
  }

  async requireForUser(id_usuario: string): Promise<AccessContext> {
    const context = await this.getForUser(id_usuario);
    if (!context) throw new NotFoundException('Usuario no encontrado');
    return context;
  }
}

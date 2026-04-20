import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { serializeBigInts } from "../shared/serialize";
import {
  CreateProductorDto,
  CreateRegionDto,
  RevisarSolicitudDto,
  SolicitarProductorDto,
  UpdateProductorDto,
  UpdateRegionDto,
} from "./dto/productores.dto";
import { NotificacionesService } from "../notificaciones/notificaciones.service";
import { ArchivosService } from "../archivos/archivos.service";

@Injectable()
export class ProductoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly archivos: ArchivosService,
  ) {}

  async findAll() { return serializeBigInts(await this.prisma.productores.findMany({ where: { eliminado_en: null }, include: { usuarios: true, regiones: true, lotes: true, tiendas: true } })); }
  async findOne(id_productor: number) { const item = await this.prisma.productores.findUnique({ where: { id_productor }, include: { usuarios: true, regiones: true, lotes: true, tiendas: true } }); if (!item || item.eliminado_en) throw new NotFoundException('Productor no encontrado'); return serializeBigInts(item); }
  async findByUsuario(id_usuario: string) { const item = await this.prisma.productores.findFirst({ where: { id_usuario, eliminado_en: null }, include: { usuarios: true, regiones: true, lotes: true, tiendas: true } }); return item ? serializeBigInts(item) : null; }
  async create(dto: CreateProductorDto) { return serializeBigInts(await this.prisma.productores.create({ data: { id_usuario: dto.id_usuario, id_region: dto.id_region ?? null, biografia: dto.biografia ?? null } })); }
  async update(id_productor: number, dto: UpdateProductorDto) { return serializeBigInts(await this.prisma.productores.update({ where: { id_productor }, data: { id_usuario: dto.id_usuario, id_region: dto.id_region ?? undefined, biografia: dto.biografia } })); }
  async remove(id_productor: number) { return serializeBigInts(await this.prisma.productores.update({ where: { id_productor }, data: { eliminado_en: new Date() } })); }
  async listRegiones() { return serializeBigInts(await this.prisma.regiones.findMany({ include: { lotes: false, productores: false } })); }
  async createRegion(dto: CreateRegionDto) { return serializeBigInts(await this.prisma.regiones.create({ data: { nombre: dto.nombre.trim(), estado_prov: dto.estado_prov ?? null, pais_iso2: dto.pais_iso2?.trim() ?? 'MX', activo: dto.activo ?? true } })); }
  async updateRegion(id_region: number, dto: UpdateRegionDto) { return serializeBigInts(await this.prisma.regiones.update({ where: { id_region }, data: { nombre: dto.nombre?.trim(), estado_prov: dto.estado_prov, pais_iso2: dto.pais_iso2?.trim(), activo: dto.activo } })); }
  async removeRegion(id_region: number) { await this.prisma.regiones.delete({ where: { id_region } }); return { message: 'Region eliminada' }; }

  async solicitarProductor(dto: SolicitarProductorDto, id_usuario: string) {
    const existing = await this.prisma.productores.findFirst({ where: { id_usuario, eliminado_en: null } });
    if (existing) {
      if (existing.estado === 'pendiente') throw new BadRequestException('Ya tienes una solicitud pendiente');
      if (existing.estado === 'aprobado') throw new BadRequestException('Ya eres productor aprobado');
      if (existing.estado === 'suspendido') throw new BadRequestException('Tu cuenta fue suspendida. Contacta al administrador');
    }

    const nuevo = await this.prisma.productores.create({
      data: {
        id_usuario,
        id_region: dto.id_region ?? null,
        biografia: dto.biografia ?? null,
        estado: 'pendiente',
        solicitado_en: new Date(),
      },
    });

    await this.archivos.create({
      entidad_tipo: 'productor_certificado',
      entidad_id: nuevo.id_productor,
      url: dto.certificado_url,
      tipo: 'NOM-070',
      estado: 'pendiente',
    });

    await this.notificaciones.create({
      id_usuario,
      tipo: 'solicitud_productor',
      titulo: 'Solicitud enviada',
      cuerpo: 'Tu solicitud para convertirte en productor ha sido enviada. Te notificaremos cuando sea revisada.',
    });

    return serializeBigInts(nuevo);
  }

  async getSolicitudesPendientes() {
    return serializeBigInts(await this.prisma.productores.findMany({
      where: { estado: 'pendiente', eliminado_en: null },
      include: {
        usuarios: { select: { id_usuario: true, nombre: true, email: true, telefono: true } },
        regiones: true,
      },
      orderBy: { solicitado_en: 'desc' },
    }));
  }

  async revisarSolicitud(id_productor: number, dto: RevisarSolicitudDto, revisor_id: string) {
    const productor = await this.prisma.productores.findUnique({ where: { id_productor } });
    if (!productor || productor.eliminado_en) throw new NotFoundException('Solicitud no encontrada');
    if (productor.estado !== 'pendiente') throw new BadRequestException('Esta solicitud ya fue procesada');

    const usuario = await this.prisma.usuarios.findUnique({ where: { id_usuario: productor.id_usuario } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    let rolProductor = null;

    if (dto.estado === 'aprobado') {
      rolProductor = await this.prisma.roles.findUnique({ where: { nombre: 'PRODUCTOR' } });
      if (rolProductor) {
        await this.prisma.usuario_rol.upsert({
          where: { id_usuario_id_rol: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol } },
          create: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol, estado: 'activo' },
          update: { estado: 'activo' },
        });
      }
    }

    const actualizado = await this.prisma.productores.update({
      where: { id_productor },
      data: {
        estado: dto.estado,
        revisado_por: revisor_id,
        revisado_en: new Date(),
        motivo_rechazo: dto.motivo_rechazo ?? null,
      },
    });

    const titulo = dto.estado === 'aprobado' ? 'Solicitud aprobada' : 'Solicitud rechazada';
    const cuerpo = dto.estado === 'aprobado'
      ? '¡Felicidades! Tu solicitud para convertirte en productor ha sido approveada. Ahora puedes publicar tus productos.'
      : `Tu solicitud ha sido rechazada. Motivo: ${dto.motivo_rechazo || 'No especificado'}`;

    await this.notificaciones.create({
      id_usuario: usuario.id_usuario,
      tipo: `solicitud_${dto.estado}`,
      titulo,
      cuerpo,
    });

    return serializeBigInts(actualizado);
  }
}

const productorSelect = {
  id_productor: true,
  id_usuario: true,
  id_region: true,
  biografia: true,
  creado_en: true,
  actualizado_en: true,
  eliminado_en: true,
  usuarios: true,
  regiones: true,
  lotes: true,
  tiendas: true,
} as const;

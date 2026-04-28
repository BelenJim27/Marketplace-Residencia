import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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
import { EmailService } from "../email/email.service";
import { createCipheriv, randomBytes, createDecipheriv } from "crypto";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || randomBytes(32).toString("hex");
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

@Injectable()
export class ProductoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly archivos: ArchivosService,
    private readonly emailService: EmailService,
  ) {}

  async findAll() {
    return serializeBigInts(
      await this.prisma.productores.findMany({
        where: { eliminado_en: null },
        include: { usuarios: true, regiones: true, lotes: true, tiendas: true },
      }),
    );
  }
  async findOne(id_productor: number) {
    const item = await this.prisma.productores.findUnique({
      where: { id_productor },
      include: { usuarios: true, regiones: true, lotes: true, tiendas: true },
    });
    if (!item || item.eliminado_en)
      throw new NotFoundException("Productor no encontrado");
    return serializeBigInts(item);
  }
  async findByUsuario(id_usuario: string) {
    const item = await this.prisma.productores.findFirst({
      where: { id_usuario, eliminado_en: null },
      include: { usuarios: true, regiones: true, lotes: true, tiendas: true },
    });
    return item ? serializeBigInts(item) : null;
  }
  async create(dto: CreateProductorDto) {
    return serializeBigInts(
      await this.prisma.productores.create({
        data: {
          id_usuario: dto.id_usuario,
          id_region: dto.id_region ?? null,
          biografia: dto.biografia ?? null,
        },
      }),
    );
  }
  async update(id_productor: number, dto: UpdateProductorDto) {
    return serializeBigInts(
      await this.prisma.productores.update({
        where: { id_productor },
        data: {
          id_usuario: dto.id_usuario,
          id_region: dto.id_region ?? undefined,
          biografia: dto.biografia,
        },
      }),
    );
  }
  async remove(id_productor: number) {
    return serializeBigInts(
      await this.prisma.productores.update({
        where: { id_productor },
        data: { eliminado_en: new Date() },
      }),
    );
  }
  async listRegiones() {
    return serializeBigInts(
      await this.prisma.regiones.findMany({ where: { activo: true } }),
    );
  }
  async createRegion(dto: CreateRegionDto) {
    return serializeBigInts(
      await this.prisma.regiones.create({
        data: {
          nombre: dto.nombre.trim(),
          estado_prov: dto.estado_prov ?? null,
          pais_iso2: dto.pais_iso2?.trim() ?? "MX",
          activo: dto.activo ?? true,
        },
      }),
    );
  }
  async updateRegion(id_region: number, dto: UpdateRegionDto) {
    return serializeBigInts(
      await this.prisma.regiones.update({
        where: { id_region },
        data: {
          nombre: dto.nombre?.trim(),
          estado_prov: dto.estado_prov,
          pais_iso2: dto.pais_iso2?.trim(),
          activo: dto.activo,
        },
      }),
    );
  }
  async removeRegion(id_region: number) {
    await this.prisma.regiones.delete({ where: { id_region } });
    return { message: "Region eliminada" };
  }

  async solicitarProductor(dto: SolicitarProductorDto, id_usuario: string) {
    const existing = await this.prisma.productores.findFirst({
      where: { id_usuario, eliminado_en: null },
    });

    if (existing) {
      if (existing.estado === "pendiente")
        throw new BadRequestException("Ya tienes una solicitud pendiente");
      if (existing.estado === "aprobado")
        throw new BadRequestException("Ya eres productor aprobado");
      if (existing.estado === "suspendido")
        throw new BadRequestException("Tu cuenta fue suspendida. Contacta al administrador");
    }

    const datosBancariosEncriptados = dto.datos_bancarios
      ? encrypt(dto.datos_bancarios)
      : null;

    let resultado: any;

    if (existing && existing.estado === "rechazado") {
      resultado = await this.prisma.productores.update({
        where: { id_productor: existing.id_productor },
        data: {
          id_region: dto.id_region ?? null,
          estado: "pendiente",
          solicitado_en: new Date(),
          rfc: dto.rfc ?? null,
          razon_social: dto.razon_social ?? null,
          datos_bancarios: datosBancariosEncriptados,
          motivo_rechazo: null,
          revisado_por: null,
          revisado_en: null,
        },
      });
    } else {
      resultado = await this.prisma.productores.create({
        data: {
          id_usuario,
          id_region: dto.id_region ?? null,
          estado: "pendiente",
          solicitado_en: new Date(),
          rfc: dto.rfc ?? null,
          razon_social: dto.razon_social ?? null,
          datos_bancarios: datosBancariosEncriptados,
        },
      });
    }

    if (dto.direccion_fiscal) {
      const direccionFiscalExistente = await this.prisma.direcciones.findFirst({
        where: { id_usuario, tipo: "facturacion", eliminado_en: null },
      });

      if (direccionFiscalExistente) {
        await this.prisma.direcciones.update({
          where: { id_direccion: direccionFiscalExistente.id_direccion },
          data: {
            ubicacion: (dto.direccion_fiscal.ubicacion ?? {}) as any,
            linea_1: dto.direccion_fiscal.linea_1 ?? null,
            linea_2: dto.direccion_fiscal.linea_2 ?? null,
            ciudad: dto.direccion_fiscal.ciudad ?? null,
            estado: dto.direccion_fiscal.estado ?? null,
            codigo_postal: dto.direccion_fiscal.codigo_postal ?? null,
            pais_iso2: dto.direccion_fiscal.pais_iso2 ?? null,
            referencia: dto.direccion_fiscal.referencia ?? null,
            es_internacional: dto.direccion_fiscal.es_internacional ?? false,
          },
        });
      } else {
        await this.prisma.direcciones.create({
          data: {
            id_usuario,
            ubicacion: (dto.direccion_fiscal.ubicacion ?? {}) as any,
            linea_1: dto.direccion_fiscal.linea_1 ?? null,
            linea_2: dto.direccion_fiscal.linea_2 ?? null,
            ciudad: dto.direccion_fiscal.ciudad ?? null,
            estado: dto.direccion_fiscal.estado ?? null,
            codigo_postal: dto.direccion_fiscal.codigo_postal ?? null,
            pais_iso2: dto.direccion_fiscal.pais_iso2 ?? null,
            referencia: dto.direccion_fiscal.referencia ?? null,
            tipo: "facturacion",
            es_internacional: dto.direccion_fiscal.es_internacional ?? false,
          },
        });
      }
    }

    if (dto.direccion_produccion) {
      const direccionProduccionExistente = await this.prisma.direcciones.findFirst({
        where: { id_usuario, tipo: "produccion", eliminado_en: null },
      });

      if (direccionProduccionExistente) {
        await this.prisma.direcciones.update({
          where: { id_direccion: direccionProduccionExistente.id_direccion },
          data: {
            ubicacion: (dto.direccion_produccion.ubicacion ?? {}) as any,
            linea_1: dto.direccion_produccion.linea_1 ?? null,
            linea_2: dto.direccion_produccion.linea_2 ?? null,
            ciudad: dto.direccion_produccion.ciudad ?? null,
            estado: dto.direccion_produccion.estado ?? null,
            codigo_postal: dto.direccion_produccion.codigo_postal ?? null,
            pais_iso2: dto.direccion_produccion.pais_iso2 ?? null,
            referencia: dto.direccion_produccion.referencia ?? null,
            es_internacional: dto.direccion_produccion.es_internacional ?? false,
          },
        });
      } else {
        await this.prisma.direcciones.create({
          data: {
            id_usuario,
            ubicacion: (dto.direccion_produccion.ubicacion ?? {}) as any,
            linea_1: dto.direccion_produccion.linea_1 ?? null,
            linea_2: dto.direccion_produccion.linea_2 ?? null,
            ciudad: dto.direccion_produccion.ciudad ?? null,
            estado: dto.direccion_produccion.estado ?? null,
            codigo_postal: dto.direccion_produccion.codigo_postal ?? null,
            pais_iso2: dto.direccion_produccion.pais_iso2 ?? null,
            referencia: dto.direccion_produccion.referencia ?? null,
            tipo: "produccion",
            es_internacional: dto.direccion_produccion.es_internacional ?? false,
          },
        });
      }
    }

    await this.notificaciones.create({
      id_usuario,
      tipo: "solicitud_productor",
      titulo: "Solicitud enviada",
      cuerpo: "Tu solicitud para convertirte en productor ha sido enviada. Te notificaremos cuando sea revisada.",
      url_accion: "/Productor/solicitar",
    });

    const usuarioData = await this.prisma.usuarios.findUnique({
      where: { id_usuario },
      select: { email: true, nombre: true },
    });
    if (usuarioData) {
      this.emailService
        .sendSolicitudRecibidaEmail(usuarioData.email, usuarioData.nombre)
        .catch((err) => console.error("[Email] sendSolicitudRecibidaEmail:", err));
    }

    return serializeBigInts(resultado);
  }

  async getMiSolicitud(id_usuario: string) {
    const solicitud = await this.prisma.productores.findFirst({
      where: { id_usuario, eliminado_en: null },
      include: {
        usuarios: { select: { id_usuario: true, nombre: true, email: true } },
      },
    });
    if (!solicitud) return null;

    const decrypted = solicitud.datos_bancarios
      ? decrypt(solicitud.datos_bancarios)
      : null;
    return serializeBigInts({
      ...solicitud,
      datos_bancarios: decrypted,
    });
  }

  async getSolicitudesPendientes() {
    return serializeBigInts(
      await this.prisma.productores.findMany({
        where: { estado: "pendiente", eliminado_en: null },
        include: {
          usuarios: {
            select: {
              id_usuario: true,
              nombre: true,
              email: true,
              telefono: true,
            },
          },
          regiones: true,
        },
        orderBy: { solicitado_en: "desc" },
      }),
    );
  }

  async revisarSolicitud(
    id_productor: number,
    dto: RevisarSolicitudDto,
    revisor_id: string,
  ) {
    const productor = await this.prisma.productores.findUnique({
      where: { id_productor },
    });
    if (!productor || productor.eliminado_en)
      throw new NotFoundException("Solicitud no encontrada");
    if (productor.estado !== "pendiente")
      throw new BadRequestException("Esta solicitud ya fue procesada");

    const usuario = await this.prisma.usuarios.findUnique({
      where: { id_usuario: productor.id_usuario },
    });
    if (!usuario) throw new NotFoundException("Usuario no encontrado");

    let rolProductor = null;

    if (dto.estado === "aprobado") {
      rolProductor = await this.prisma.roles.findUnique({
        where: { nombre: "productor" },
      });
      if (rolProductor) {
        await this.prisma.usuario_rol.updateMany({
          where: {
            id_usuario: usuario.id_usuario,
            roles: { nombre: "cliente" },
          },
          data: { estado: "inactivo" },
        });
        await this.prisma.usuario_rol.upsert({
          where: {
            id_usuario_id_rol: {
              id_usuario: usuario.id_usuario,
              id_rol: rolProductor.id_rol,
            },
          },
          create: {
            id_usuario: usuario.id_usuario,
            id_rol: rolProductor.id_rol,
            estado: "activo",
          },
          update: { estado: "activo" },
        });
      }

      const existingTienda = await this.prisma.tiendas.findFirst({
        where: { id_productor, eliminado_en: null },
      });

      if (!existingTienda) {
        await this.prisma.tiendas.create({
          data: {
            id_productor,
            nombre: `${usuario.nombre}'s Store`,
            descripcion: `Tienda de ${usuario.nombre}`,
            pais_operacion: "MX",
            status: "activa",
          },
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

    const titulo =
      dto.estado === "aprobado" ? "Solicitud aprobada" : "Solicitud rechazada";
    const cuerpo =
      dto.estado === "aprobado"
        ? "¡Felicidades! Tu solicitud para convertirte en productor ha sido aprobada. Ahora puedes publicar tus productos."
        : `Tu solicitud ha sido rechazada. Motivo: ${dto.motivo_rechazo || "No especificado"}`;

    await this.notificaciones.create({
      id_usuario: usuario.id_usuario,
      tipo: `solicitud_${dto.estado}`,
      titulo,
      cuerpo,
      url_accion: dto.estado === "aprobado" ? "/dashboard/productor" : "/Productor/solicitar",
    });

    if (dto.estado === "aprobado") {
      this.emailService
        .sendProductorApprovedEmail(usuario.email, usuario.nombre, dto.motivo_aprobacion)
        .catch((err) => console.error("[Email] sendProductorApprovedEmail:", err));
    } else {
      this.emailService
        .sendProductorRejectedEmail(usuario.email, usuario.nombre, dto.motivo_rechazo)
        .catch((err) => console.error("[Email] sendProductorRejectedEmail:", err));
    }

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

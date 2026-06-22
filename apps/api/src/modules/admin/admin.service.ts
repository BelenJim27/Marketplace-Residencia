import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeBigInts } from '../../common/utilities/serialize';
import { RevisarSolicitudDto } from '../productores/dto/productores.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
    private emailService: EmailService,
  ) {}

  async getStats() {
    const [
      totalUsuarios,
      totalProductores,
      totalPedidos,
      totalIngresos,
      pedidosPendientes,
      pedidosEnviados,
      productoresActivos,
    ] = await Promise.all([
      this.prisma.usuarios.count({ where: { eliminado_en: null } }),
      this.prisma.productores.count({ where: { eliminado_en: null } }),
      // Pedidos pagados: solo los que cobraron (estado = 'pagado').
      this.prisma.pedidos.count({ where: { estado: 'pagado', eliminado_en: null } }),
      // Ventas totales: suma del total de los pedidos pagados.
      this.prisma.pedidos.aggregate({
        where: { estado: 'pagado', eliminado_en: null },
        _sum: { total: true },
      }),
      this.prisma.pedidos.count({
        where: { estado: 'pendiente', eliminado_en: null },
      }),
      // Pedidos enviados: ya despachados (en tránsito o entregados).
      this.prisma.pedidos.count({
        where: { estado: { in: ['enviado', 'entregado'] }, eliminado_en: null },
      }),
      this.prisma.productores.count({
        where: {
          eliminado_en: null,
          tiendas: { some: { status: 'activa', eliminado_en: null } },
        },
      }),
    ]);

    return {
      totalUsuarios: Number(totalUsuarios),
      totalProductores: Number(totalProductores),
      totalPedidos: Number(totalPedidos),
      totalIngresos: Number(totalIngresos._sum.total ?? 0),
      pedidosPendientes: Number(pedidosPendientes),
      pedidosEnviados: Number(pedidosEnviados),
      productoresActivos: Number(productoresActivos),
    };
  }

  async getRecentOrders(limit = 10) {
    return this.prisma.pedidos.findMany({
      take: limit,
      orderBy: { fecha_creacion: 'desc' },
      where: { eliminado_en: null },
      include: {
        usuarios: {
          select: { nombre: true, email: true },
        },
      },
    });
  }

  async getTopProductores(limit = 5) {
    // Agregación en la BD (GROUP BY) en vez de descargar todos los pedidos con
    // includes anidados y sumar en JS. groupBy de Prisma no soporta SUM de una
    // expresión (precio_compra * cantidad), por eso se usa $queryRaw.
    const rows = await this.prisma.$queryRaw<
      Array<{ id_productor: number; nombre: string | null; totalventas: unknown; pedidos: unknown }>
    >`
      SELECT t.id_productor              AS id_productor,
             p.biografia                 AS nombre,
             SUM(dp.precio_compra * dp.cantidad) AS totalventas,
             COUNT(*)                    AS pedidos
      FROM detalle_pedido dp
      JOIN productos   pr ON pr.id_producto  = dp.id_producto
      JOIN tiendas     t  ON t.id_tienda     = pr.id_tienda
      JOIN productores p  ON p.id_productor  = t.id_productor
      JOIN pedidos     pe ON pe.id_pedido    = dp.id_pedido
      WHERE pe.estado IN ('entregado', 'enviado') AND pe.eliminado_en IS NULL
      GROUP BY t.id_productor, p.biografia
      ORDER BY totalventas DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id_productor: Number(r.id_productor),
      totalVentas: Number(r.totalventas ?? 0),
      pedidos: Number(r.pedidos ?? 0),
      nombre: r.nombre || 'Productor',
    }));
  }

  // ── FIX: incluye productor_categoria y mapea a "categorias" ──────────────
  async getSolicitudesPendientes() {
    const solicitudes = await this.prisma.productores.findMany({
      where: { eliminado_en: null },
      include: {
        usuarios: {
          select: { id_usuario: true, nombre: true, email: true, telefono: true },
        },
        regiones: true,
        productor_categoria: {
          include: {
            categorias: {
              select: { id_categoria: true, nombre: true },
            },
          },
        },
      },
      orderBy: { solicitado_en: 'desc' },
    });

    return serializeBigInts(
      solicitudes.map((s) => ({
        ...s,
        categorias: s.productor_categoria.map((pc) => pc.categorias),
      })),
    );
  }

  async getAllProductores(filters?: {
    estado?: string;
    asociacion?: string;
    marca?: string;
    id_categoria?: number;
  }) {
    const where: any = { eliminado_en: null };
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.asociacion) where.asociacion = filters.asociacion;
    if (filters?.marca) {
      where.tiendas = { some: { nombre: { contains: filters.marca, mode: 'insensitive' }, eliminado_en: null } };
    }
    if (filters?.id_categoria) {
      where.productor_categoria = { some: { id_categoria: filters.id_categoria } };
    }

    const rows = await this.prisma.productores.findMany({
      where,
      include: {
        usuarios: { select: { id_usuario: true, nombre: true, email: true, telefono: true, apellido_paterno: true, apellido_materno: true } },
        regiones: true,
        tiendas: { where: { eliminado_en: null }, select: { id_tienda: true, nombre: true, status: true } },
        productor_categoria: { include: { categorias: { select: { id_categoria: true, nombre: true } } } },
      },
      orderBy: { solicitado_en: 'desc' },
      take: 200,
    });

    return serializeBigInts(rows.map((r) => ({
      ...r,
      categorias: r.productor_categoria.map((pc) => pc.categorias),
      marca: r.tiendas?.[0]?.nombre ?? null,
    })));
  }

  async getAllProductos(id_productor?: number) {
    try {
      const where: any = { eliminado_en: null };
      if (id_productor) {
        where.tiendas = { id_productor };
      }

      const items = await this.prisma.productos.findMany({
        where,
        select: {
          id_producto: true,
          nombre: true,
          descripcion: true,
          status: true,
          precio_base: true,
          moneda_base: true,
          imagen_principal_url: true,
          creado_en: true,
          id_tienda: true,
          id_lote: true,
          tiendas: {
            select: {
              id_tienda: true,
              nombre: true,
              id_productor: true,
              productores: {
                select: {
                  usuarios: {
                    select: { nombre: true, apellido_paterno: true },
                  },
                },
              },
            },
          },
          inventario: { select: { stock: true } },
          categorias_productos: {
            select: {
              categorias: { select: { id_categoria: true, nombre: true } },
            },
          },
        },
        orderBy: { creado_en: 'desc' },
        take: 200,
      });

      return serializeBigInts(items.map((item: any) => {
        const stock = (item.inventario ?? []).reduce((acc: number, i: any) => acc + Number(i.stock ?? 0), 0);
        const cats = (item.categorias_productos ?? []).map((cp: any) => cp.categorias?.nombre).filter(Boolean);
        const u = item.tiendas?.productores?.usuarios;
        const nombreProductor = u ? [u.nombre, u.apellido_paterno].filter(Boolean).join(' ') : null;

        return {
          id_producto: item.id_producto,
          nombre: item.nombre,
          descripcion: item.descripcion ?? null,
          status: item.status,
          estado: item.status,
          precio_base: Number(item.precio_base ?? 0),
          precio: Number(item.precio_base ?? 0),
          moneda_base: item.moneda_base ?? 'MXN',
          moneda: item.moneda_base ?? 'MXN',
          imagen_url: item.imagen_principal_url ?? null,
          nombre_tienda: item.tiendas?.nombre ?? null,
          nombre_productor: nombreProductor,
          stock,
          categoria: cats[0] ?? null,
          categorias: cats,
          categorias_full: (item.categorias_productos ?? [])
            .map((cp: any) => ({ id_categoria: Number(cp.categorias?.id_categoria), nombre: cp.categorias?.nombre }))
            .filter((c: any) => c.id_categoria && !isNaN(c.id_categoria)),
          id_tienda: item.id_tienda,
          id_lote: item.id_lote,
        };
      }));
    } catch (err) {
      this.logger.error(`[AdminService.getAllProductos] Error: ${(err as Error)?.message}`);
      throw err;
    }
  }

  async revisarSolicitud(id_productor: number, dto: RevisarSolicitudDto, revisor_id: string) {
    const productor = await this.prisma.productores.findUnique({ where: { id_productor } });
    if (!productor || productor.eliminado_en) throw new NotFoundException('Solicitud no encontrada');
    if (productor.estado !== 'pendiente') throw new BadRequestException('Esta solicitud ya fue procesada');

    const usuario = await this.prisma.usuarios.findUnique({ where: { id_usuario: productor.id_usuario } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    let rolProductor = null;

    if (dto.estado === 'aprobado') {
      rolProductor = await this.prisma.roles.findUnique({ where: { nombre: 'productor' } });
      const rolCliente = await this.prisma.roles.findUnique({ where: { nombre: 'cliente' } });

      if (rolCliente) {
        await this.prisma.usuario_rol.updateMany({
          where: { id_usuario: usuario.id_usuario, id_rol: rolCliente.id_rol },
          data: { estado: 'inactivo' },
        });
      }

      if (rolProductor) {
        await this.prisma.usuario_rol.upsert({
          where: { id_usuario_id_rol: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol } },
          create: { id_usuario: usuario.id_usuario, id_rol: rolProductor.id_rol, estado: 'activo' },
          update: { estado: 'activo' },
        });
      }

      const existingTienda = await this.prisma.tiendas.findFirst({
        where: { id_productor, eliminado_en: null },
      });

      if (!existingTienda) {
        const nombreTienda = productor.nombre_marca || `${usuario.nombre}'s Store`;
        await this.prisma.tiendas.create({
          data: {
            id_productor,
            nombre: nombreTienda,
            descripcion: `Tienda de ${usuario.nombre}`,
            pais_operacion: 'MX',
            status: 'activa',
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

    const titulo = dto.estado === 'aprobado' ? 'Solicitud aprobada' : 'Solicitud rechazada';
    const cuerpo = dto.estado === 'aprobado'
      ? '¡Felicidades! Tu solicitud para convertirte en productor ha sido aprobada. Ahora puedes publicar tus productos.'
      : `Tu solicitud ha sido rechazada. Motivo: ${dto.motivo_rechazo || 'No especificado'}`;

    await this.notificaciones.create({
      id_usuario: usuario.id_usuario,
      tipo: `solicitud_${dto.estado}`,
      titulo,
      cuerpo,
    });

    if (dto.estado === 'aprobado') {
      this.emailService
        .sendProductorApprovedEmail(usuario.email, usuario.nombre, dto.motivo_aprobacion)
        .catch((err) => this.logger.warn(`[Email] sendProductorApprovedEmail: ${(err as Error)?.message}`));
    } else {
      this.emailService
        .sendProductorRejectedEmail(usuario.email, usuario.nombre, dto.motivo_rechazo)
        .catch((err) => this.logger.warn(`[Email] sendProductorRejectedEmail: ${(err as Error)?.message}`));
    }

    return serializeBigInts(actualizado);
  }
}
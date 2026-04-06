import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProductosModule } from './modules/productos/productos.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { LotesModule } from './modules/lotes/lotes.module';
import { ProductoresModule } from './modules/productores/productores.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { EnviosModule } from './modules/envios/envios.module';
import { TransportistasModule } from './modules/transportistas/transportistas.module';
import { CarritoModule } from './modules/carrito/carrito.module';
import { TiendasModule } from './modules/tiendas/tiendas.module';
import { ResenasModule } from './modules/resenas/resenas.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { DireccionesModule } from './modules/direcciones/direcciones.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { ArchivosModule } from './modules/archivos/archivos.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsuariosModule,
    RolesModule,
    ProductosModule,
    CategoriasModule,
    InventarioModule,
    LotesModule,
    ProductoresModule,
    PedidosModule,
    PagosModule,
    EnviosModule,
    TransportistasModule,
    CarritoModule,
    TiendasModule,
    ResenasModule,
    NotificacionesModule,
    DireccionesModule,
    ConfiguracionModule,
    ArchivosModule,
    AuditoriaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

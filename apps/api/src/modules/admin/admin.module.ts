import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, NotificacionesModule, EmailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

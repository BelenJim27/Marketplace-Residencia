import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { AuthGuard } from './guards/auth.guard';
import { AccessContextService } from './access-context.service';
import { SessionInvalidationService } from './session-invalidation.service';

@Global()
@Module({
  imports: [PrismaModule, EmailModule, NotificacionesModule],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, OAuthService, AuthGuard, AccessContextService, SessionInvalidationService],
  exports: [AuthService, OAuthService, AuthGuard, AccessContextService, SessionInvalidationService],
})
export class AuthModule {}

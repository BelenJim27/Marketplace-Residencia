import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyJwt } from '../auth.service';
import { AccessContextService } from '../access-context.service';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error('[auth] JWT_ACCESS_SECRET no configurada. El servidor no puede iniciar sin secretos JWT seguros.');
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly accessContext: AccessContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    let token: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (request.cookies?.token) {
      token = request.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    try {
      const payload = verifyJwt<{
        sub: string;
        email: string;
        version_token: number;
        token_type: string;
        roles: string[];
        permisos: string[];
        id_productor: number | null;
      }>(token, ACCESS_TOKEN_SECRET!);

      if (payload.token_type !== 'access') {
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.accessContext.getForUser(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado o eliminado');
      }

      if (user.version_token !== payload.version_token) {
        throw new UnauthorizedException('Sesión invalidada. Inicia sesión nuevamente.');
      }

      if (user.roles.length === 0) {
        throw new UnauthorizedException('No tienes roles activos');
      }

      request.user = {
        id_usuario: user.id_usuario,
        email: user.email,
        version_token: user.version_token,
        roles: user.roles,
        permisos: user.permisos,
        id_productor: user.id_productor,
      };
      request.authProfile = user.profile;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

}

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyJwt } from '../auth.service';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = authHeader.slice(7);

    try {
      const payload = verifyJwt<{
        sub: string;
        email: string;
        version_token: number;
        token_type: string;
        roles: string[];
        permisos: string[];
        id_productor: number | null;
      }>(token, ACCESS_TOKEN_SECRET);

      if (payload.token_type !== 'access') {
        throw new UnauthorizedException('Token inválido');
      }

      request.user = {
        id_usuario: payload.sub,
        email: payload.email,
        version_token: payload.version_token,
        roles: payload.roles,
        permisos: payload.permisos,
        id_productor: payload.id_productor,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
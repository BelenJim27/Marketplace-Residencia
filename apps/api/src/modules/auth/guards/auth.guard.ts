import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyJwt } from '../auth.service';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error('[auth] JWT_ACCESS_SECRET no configurada. El servidor no puede iniciar sin secretos JWT seguros.');
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Accept token from Authorization header OR from HttpOnly cookie (credentials: include)
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
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISOS_KEY = 'permisos';
export const REQUIRED_ANY_PERMISOS_KEY = 'required_any_permisos';
export const REQUIRED_ALL_PERMISOS_KEY = 'required_all_permisos';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const requiredAny = this.reflector.getAllAndOverride<string[]>(REQUIRED_ANY_PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredAll = this.reflector.getAllAndOverride<string[]>(REQUIRED_ALL_PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const legacyPermisos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredAny && !requiredAll && !legacyPermisos) {
      return true;
    }

    if (!user || !user.permisos) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }

    if (requiredAny && requiredAny.length > 0) {
      const hasAny = requiredAny.some((permiso) => user.permisos.includes(permiso));
      if (!hasAny) {
        throw new ForbiddenException('No tienes los permisos necesarios para acceder a este recurso');
      }
      return true;
    }

    if ((requiredAll || legacyPermisos) && (requiredAll || legacyPermisos).length > 0) {
      const allRequired = requiredAll ?? legacyPermisos;
      const hasAll = allRequired.every((permiso: string) => user.permisos.includes(permiso));
      if (!hasAll) {
        throw new ForbiddenException('No tienes todos los permisos necesarios para acceder a este recurso');
      }
      return true;
    }

    return true;
  }
}

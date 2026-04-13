import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const PERMISOS_KEY = 'permisos';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('No tienes el rol necesario para acceder a este recurso');
    }

    return true;
  }
}

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermisos = this.reflector.get<string[]>(PERMISOS_KEY, context.getHandler());
    if (!requiredPermisos) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permisos) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }

    const hasAllPermisos = requiredPermisos.every((permiso) => user.permisos.includes(permiso));

    if (!hasAllPermisos) {
      throw new ForbiddenException('No tienes los permisos necesarios para acceder a este recurso');
    }

    return true;
  }
}

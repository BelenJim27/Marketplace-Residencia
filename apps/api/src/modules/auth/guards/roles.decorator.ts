import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const PERMISOS_KEY = 'permisos';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Permisos = (...permisos: string[]) => SetMetadata(PERMISOS_KEY, permisos);

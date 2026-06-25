import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ANY_PERMISOS_KEY = 'required_any_permisos';
export const REQUIRED_ALL_PERMISOS_KEY = 'required_all_permisos';

export const RequireAnyPermission = (...permisos: string[]) =>
  SetMetadata(REQUIRED_ANY_PERMISOS_KEY, permisos);

export const RequireAllPermissions = (...permisos: string[]) =>
  SetMetadata(REQUIRED_ALL_PERMISOS_KEY, permisos);

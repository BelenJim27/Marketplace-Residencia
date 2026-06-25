import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermisosGuard } from './rbac.guard';
import { REQUIRED_ALL_PERMISOS_KEY, REQUIRED_ANY_PERMISOS_KEY } from './permisos.decorator';

function contextFor(permisos: string[]) {
  return {
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
    switchToHttp: () => ({ getRequest: () => ({ user: { permisos } }) }),
  } as any;
}

describe('PermisosGuard', () => {
  it('permite cuando coincide al menos un permiso anyOf', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === REQUIRED_ANY_PERMISOS_KEY ? ['gestionar_pedidos', 'gestionar_usuarios'] : undefined,
      ),
    } as unknown as Reflector;
    expect(new PermisosGuard(reflector).canActivate(contextFor(['gestionar_pedidos']))).toBe(true);
  });

  it('exige todos los permisos allOf', () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === REQUIRED_ALL_PERMISOS_KEY ? ['crear_pedido', 'pagar'] : undefined,
      ),
    } as unknown as Reflector;
    const guard = new PermisosGuard(reflector);
    expect(() => guard.canActivate(contextFor(['crear_pedido']))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor(['crear_pedido', 'pagar']))).toBe(true);
  });
});

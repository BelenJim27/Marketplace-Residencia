describe('AuthGuard', () => {
  const profile = {
    nombre: 'Usuario',
    apellido_paterno: null,
    apellido_materno: null,
    telefono: null,
    foto_url: null,
    idioma_preferido: 'es',
    moneda_preferida: 'MXN',
    fecha_registro: new Date(),
  };

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_ACCESS_SECRET = 'test-secret';
  });

  function createGuard(versionToken = 3) {
    jest.doMock('../auth.service', () => ({
      verifyJwt: jest.fn(() => ({
        sub: 'usuario-1',
        email: 'usuario@example.com',
        version_token: versionToken,
        token_type: 'access',
      })),
    }));
    const { AuthGuard } = require('./auth.guard') as typeof import('./auth.guard');
    const accessContext = {
      getForUser: jest.fn().mockResolvedValue({
        id_usuario: 'usuario-1',
        email: 'usuario@example.com',
        version_token: 3,
        roles: ['solo_pedidos'],
        permisos: ['gestionar_pedidos'],
        id_productor: null,
        profile,
      }),
    };
    return { guard: new AuthGuard(accessContext as any), accessContext };
  }

  function context(request: Record<string, any>) {
    return { switchToHttp: () => ({ getRequest: () => request }) } as any;
  }

  it('sustituye roles y permisos del JWT por el contexto actual de base de datos', async () => {
    const { guard, accessContext } = createGuard();
    const request = { headers: { authorization: 'Bearer token' } } as any;

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(accessContext.getForUser).toHaveBeenCalledWith('usuario-1');
    expect(request.user.permisos).toEqual(['gestionar_pedidos']);
    expect(request.user.roles).toEqual(['solo_pedidos']);
  });

  it('rechaza inmediatamente un token cuya versión fue invalidada', async () => {
    const { guard } = createGuard(2);
    const request = { headers: { authorization: 'Bearer token' } };

    await expect(guard.canActivate(context(request))).rejects.toMatchObject({
      status: 401,
      message: 'Sesión invalidada. Inicia sesión nuevamente.',
    });
  });
});

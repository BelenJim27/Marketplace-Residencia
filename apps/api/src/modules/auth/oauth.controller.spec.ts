// Secretos requeridos por auth.service en load-time (requireSecret). Deben estar
// definidos ANTES de cargar el módulo del controller, por eso el require es diferido.
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET || 'test-reset-secret';

import { UnauthorizedException } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { OAuthController } = require('./oauth.controller') as typeof import('./oauth.controller');

describe('OAuthController.googleOAuth — verificación de token (M-6)', () => {
  let controller: InstanceType<typeof OAuthController>;
  const mockOauth = { upsertOAuthAccount: jest.fn() };
  const mockAuth = { loginWithOAuth: jest.fn() };
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'client-123';
    mockOauth.upsertOAuthAccount.mockResolvedValue('user-uuid');
    mockAuth.loginWithOAuth.mockResolvedValue({ tokens: { access_token: 'a', refresh_token: 'r' }, user: { id_usuario: 'user-uuid' } });
    controller = new OAuthController(mockOauth as any, mockAuth as any);
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  const mockTokenInfo = (ok: boolean, body: any) => {
    global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body }) as any;
  };

  it('rechaza cuando Google no valida el token (tokeninfo !ok)', async () => {
    mockTokenInfo(false, {});
    await expect(controller.googleOAuth({ access_token: 'bad', provider_uid: 'x' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockOauth.upsertOAuthAccount).not.toHaveBeenCalled();
  });

  it('rechaza cuando el aud del token no es de esta app', async () => {
    mockTokenInfo(true, { aud: 'otra-app', sub: '123', email: 'a@b.com', email_verified: 'true' });
    await expect(controller.googleOAuth({ access_token: 't', provider_uid: 'x' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockOauth.upsertOAuthAccount).not.toHaveBeenCalled();
  });

  it('rechaza cuando el email no está verificado', async () => {
    mockTokenInfo(true, { aud: 'client-123', sub: '123', email: 'a@b.com', email_verified: 'false' });
    await expect(controller.googleOAuth({ access_token: 't', provider_uid: 'x' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('IGNORA el provider_uid/email del body y usa la identidad verificada (anti-takeover)', async () => {
    // El atacante envía el email de la víctima en el body, pero el token verificado
    // pertenece a otra identidad → se usa la del token, no la del body.
    mockTokenInfo(true, { aud: 'client-123', sub: 'real-sub-999', email: 'Atacante@Gmail.com', email_verified: true });
    await controller.googleOAuth({ access_token: 't', provider_uid: 'spoofed', email: 'victima@gmail.com' } as any);
    expect(mockOauth.upsertOAuthAccount).toHaveBeenCalledWith(
      expect.objectContaining({ providerUid: 'real-sub-999', email: 'atacante@gmail.com' }),
    );
  });
});

import { Body, Controller, Get, HttpCode, Logger, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { OAuthService } from './oauth.service';
import { AuthService } from './auth.service';

// Almacén temporal de códigos OAuth (en memoria, TTL 90s).
// El código se consume una sola vez: el atacante que robe la URL /auth/callback?code=…
// no obtiene tokens reales, solo un código de un único uso que expira rápidamente.
const pendingOAuthCodes = new Map<string, { access_token: string; refresh_token: string; expires: number }>();

function generateOAuthCode(tokens: { access_token: string; refresh_token: string }): string {
  const code = randomBytes(32).toString('hex');
  pendingOAuthCodes.set(code, { ...tokens, expires: Date.now() + 90_000 });
  // Limpiar códigos expirados (housekeeping pasivo)
  for (const [k, v] of pendingOAuthCodes) {
    if (v.expires < Date.now()) pendingOAuthCodes.delete(k);
  }
  return code;
}

interface OAuthGoogleDto {
  access_token: string;
  refresh_token?: string;
  provider_uid: string;
  email?: string;
  nombre?: string;
  fotoUrl?: string;
}

interface GoogleVerifiedIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
}

@Controller('auth/oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Verifica el access token contra Google y devuelve la identidad REAL (sub, email).
   * Sin esto, el endpoint confiaría en el `provider_uid`/`email` del body: un atacante
   * podría enviar el email de cualquier víctima y, como `upsertOAuthAccount` hace match
   * por email, recibir sus JWTs (toma de cuenta). Aquí derivamos la identidad del token
   * verificado y validamos que el token fue emitido para ESTA app (aud === GOOGLE_CLIENT_ID).
   */
  private async verifyGoogleAccessToken(accessToken: string): Promise<GoogleVerifiedIdentity> {
    if (!accessToken) throw new UnauthorizedException('Falta el token de Google');

    let info: any;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) throw new Error(`tokeninfo HTTP ${res.status}`);
      info = await res.json();
    } catch (err) {
      this.logger.warn(`[OAuth] Verificación de token de Google falló: ${(err as Error)?.message}`);
      throw new UnauthorizedException('No se pudo verificar el token de Google');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const aud = info.aud ?? info.azp;
    if (clientId) {
      if (aud !== clientId) {
        throw new UnauthorizedException('El token de Google no pertenece a esta aplicación');
      }
    } else {
      this.logger.warn('[OAuth] GOOGLE_CLIENT_ID no configurado: no se valida el aud del token.');
    }

    if (!info.sub) throw new UnauthorizedException('Token de Google sin identificador de usuario');
    const emailVerified = info.email_verified === true || info.email_verified === 'true';
    if (!info.email || !emailVerified) {
      throw new UnauthorizedException('La cuenta de Google no tiene un correo verificado');
    }

    return { sub: String(info.sub), email: String(info.email).toLowerCase(), emailVerified };
  }

  @Post('google')
  @HttpCode(200)
  async googleOAuth(@Body() dto: OAuthGoogleDto) {
    // La identidad se toma del token VERIFICADO con Google, nunca del body del cliente.
    const verified = await this.verifyGoogleAccessToken(dto.access_token);
    this.logger.debug(`[OAuth] Google login verificado sub=${verified.sub}`);

    try {
      const idUsuario = await this.oauthService.upsertOAuthAccount({
        provider: 'google',
        providerUid: verified.sub,
        email: verified.email,
        nombre: dto.nombre || '',
        fotoUrl: dto.fotoUrl || '',
        accesoToken: dto.access_token,
        refrescoToken: dto.refresh_token,
        expiraEn: undefined,
      });

      const authResult = await this.authService.loginWithOAuth(idUsuario);

      return {
        tokens: authResult.tokens,
        user: authResult.user,
      };
    } catch (error) {
      this.logger.error(`[OAuth] Error: ${(error as Error)?.message}`);
      throw error;
    }
  }

  @Get('google')
  googleAuth() {}

  @Get('google/callback')
  async googleCallback(@Req() req: any, @Res() res: any) {
    const { user } = req;
    if (!user?.id) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=oauth_failed`);
    }

    const idUsuario = await this.oauthService.upsertOAuthAccount({
      provider: 'google',
      providerUid: user.id,
      email: user.email,
      nombre: user.name,
      fotoUrl: user.picture,
      accesoToken: user.accessToken,
      refrescoToken: user.refreshToken,
      expiraEn: user.expiresAt,
    });

    const authResult = await this.authService.loginWithOAuth(idUsuario);

    // Generamos un código temporal de un solo uso (90s) en lugar de pasar los tokens en la URL.
    // La URL /auth/callback solo recibe el código; los tokens nunca aparecen en el historial del navegador.
    const code = generateOAuthCode(authResult.tokens);
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?code=${code}`;
    res.redirect(redirectUrl);
  }

  // Canjea un código OAuth temporal por los tokens reales. Un solo uso.
  @Post('exchange-code')
  @HttpCode(200)
  exchangeOAuthCode(@Body() body: { code: string }, @Res({ passthrough: true }) res: any) {
    const entry = pendingOAuthCodes.get(body?.code ?? '');
    if (!entry || entry.expires < Date.now()) {
      throw new UnauthorizedException('Código OAuth inválido o expirado');
    }
    pendingOAuthCodes.delete(body.code);
    // Set HttpOnly cookies so the browser stores auth tokens securely
    const isProd = process.env.NODE_ENV === 'production';
    const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
    res.cookie('token', entry.access_token, { ...base, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', entry.refresh_token, { ...base, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.cookie('session', 'active', { secure: isProd, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
    // Also return in body for backward compat (auth/callback/page.tsx reads them)
    return { access_token: entry.access_token, refresh_token: entry.refresh_token };
  }
}
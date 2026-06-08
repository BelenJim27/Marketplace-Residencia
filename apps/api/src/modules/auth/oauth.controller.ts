import { Body, Controller, Get, HttpCode, Logger, Post, Req, Res } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { AuthService } from './auth.service';

interface OAuthGoogleDto {
  access_token: string;
  refresh_token?: string;
  provider_uid: string;
  email?: string;
  nombre?: string;
  fotoUrl?: string;
}

@Controller('auth/oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly authService: AuthService,
  ) {}

  @Post('google')
  @HttpCode(200)
  async googleOAuth(@Body() dto: OAuthGoogleDto) {
    this.logger.debug(`[OAuth] Google login request uid=${dto.provider_uid}`);

    try {
      const idUsuario = await this.oauthService.upsertOAuthAccount({
        provider: 'google',
        providerUid: dto.provider_uid,
        email: dto.email || '',
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

    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${authResult.tokens.access_token}&refresh=${authResult.tokens.refresh_token}`;
    res.redirect(redirectUrl);
  }
}
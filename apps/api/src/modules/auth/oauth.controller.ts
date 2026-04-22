import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
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
  constructor(
    private readonly oauthService: OAuthService,
    private readonly authService: AuthService,
  ) {}

  @Post('google')
  @HttpCode(200)
  async googleOAuth(@Body() dto: OAuthGoogleDto) {
    console.log('🔵 [OAuth] Google login request:', {
      provider_uid: dto.provider_uid,
      email: dto.email,
      nombre: dto.nombre,
    });

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

      console.log('✅ [OAuth] Usuario creado/actualizado:', idUsuario);

      const authResult = await this.authService.loginWithOAuth(idUsuario);

      console.log('✅ [OAuth] Auth result:', {
        userId: authResult.user.id_usuario,
        email: authResult.user.email,
        roles: authResult.user.roles,
      });

      return {
        tokens: authResult.tokens,
        user: authResult.user,
      };
    } catch (error) {
      console.error('❌ [OAuth] Error:', error);
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
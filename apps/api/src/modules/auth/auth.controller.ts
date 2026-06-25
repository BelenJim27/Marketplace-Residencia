import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  LoginAuthDto,
  LogoutAuthDto,
  RefreshAuthDto,
  RegisterAuthDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(res: Response, tokens: { access_token: string; refresh_token: string }) {
    const isProd = process.env.NODE_ENV === 'production';
    const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
    // HttpOnly access token (15 min) — not readable by JS, sent automatically via credentials:include
    res.cookie('token', tokens.access_token, { ...base, maxAge: 15 * 60 * 1000 });
    // HttpOnly refresh token (30 days)
    res.cookie('refresh_token', tokens.refresh_token, { ...base, maxAge: 30 * 24 * 60 * 60 * 1000 });
    // Non-HttpOnly session indicator so JS can detect if a session is active without reading the token
    res.cookie('session', 'active', { secure: isProd, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const base = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/', maxAge: 0 };
    res.cookie('token', '', base);
    res.cookie('refresh_token', '', base);
    res.cookie('session', '', { secure: isProd, sameSite: 'lax' as const, path: '/', maxAge: 0 });
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterAuthDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginAuthDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) {
    const user = (req as any).user;
    const profile = (req as any).authProfile;
    return {
      id_usuario: user.id_usuario,
      email: user.email,
      nombre: profile.nombre,
      apellido_paterno: profile.apellido_paterno,
      apellido_materno: profile.apellido_materno,
      telefono: profile.telefono,
      biografia: null,
      foto_url: profile.foto_url,
      idioma_preferido: profile.idioma_preferido,
      moneda_preferida: profile.moneda_preferida,
      roles: user.roles,
      permisos: user.permisos,
      id_productor: user.id_productor,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshAuthDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Accept refresh token from request body (backward compat) OR from HttpOnly cookie
    const refreshToken = dto.refresh_token ?? (req as any).cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('Refresh token requerido');
    const result = await this.authService.refresh({ refresh_token: refreshToken });
    this.setAuthCookies(res, result.tokens);
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() dto: LogoutAuthDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Clear HttpOnly cookies first (regardless of whether we can call the service)
    this.clearAuthCookies(res);
    const refreshToken = dto.refresh_token ?? (req as any).cookies?.refresh_token;
    if (refreshToken) {
      try { await this.authService.logout({ refresh_token: refreshToken }); } catch { /* best-effort */ }
    }
    return { message: 'Sesión cerrada' };
  }

  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @Post('password-reset/request')
  @HttpCode(200)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @Post('password-reset/confirm')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

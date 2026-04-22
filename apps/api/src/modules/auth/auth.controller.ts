import { Body, Controller, Get, Headers, HttpCode, Ip, Post, UnauthorizedException } from '@nestjs/common';
import {
  LoginAuthDto,
  LogoutAuthDto,
  RefreshAuthDto,
  RegisterAuthDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    return this.authService.getMe(token);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshAuthDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: LogoutAuthDto) {
    return this.authService.logout(dto);
  }

  @Post('password-reset/request')
  @HttpCode(200)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

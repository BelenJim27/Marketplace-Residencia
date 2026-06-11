import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_REGEX,
  USERNAME_MESSAGE,
  USERNAME_REGEX,
} from './password.validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toLowerCase().trim() : value;

export class RegisterAuthDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(USERNAME_REGEX, { message: USERNAME_MESSAGE })
  nombre_usuario!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido_paterno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido_materno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  biografia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  foto_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  idioma_preferido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda_preferida?: string;
}

export class LoginAuthDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class RefreshAuthDto {
  @IsString()
  refresh_token!: string;
}

export class LogoutAuthDto {
  @IsString()
  refresh_token!: string;
}

export class RequestPasswordResetDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  password!: string;
}

export class AuthTokensDto {
  access_token!: string;
  refresh_token!: string;
}

export class AuthUserDto {
  id_usuario!: string;
  nombre!: string;
  email!: string;
  apellido_paterno!: string | null;
  apellido_materno!: string | null;
  telefono!: string | null;
  biografia!: string | null;
  foto_url!: string | null;
  idioma_preferido!: string;
  moneda_preferida!: string;
  version_token!: number;
  fecha_registro!: Date;
  eliminado_en!: Date | null;
  roles?: string[];
  permisos?: string[];
  id_productor?: number | null;
}

export class AuthResponseDto {
  user!: AuthUserDto;
  tokens!: AuthTokensDto;
}

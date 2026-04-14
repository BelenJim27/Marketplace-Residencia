import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterAuthDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
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

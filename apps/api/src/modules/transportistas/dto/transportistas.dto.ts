import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTransportistaDto {
  @IsString() @MaxLength(30) codigo!: string;
  @IsString() @MaxLength(150) nombre!: string;
  @IsArray() paises_operacion!: string[];
  @IsOptional() @IsString() api_base_url?: string;
  @IsOptional() @IsString() notas_integracion?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class UpdateTransportistaDto extends PartialType(CreateTransportistaDto) {}

export class CreateServicioEnvioDto {
  @IsInt() @Type(() => Number) id_transportista!: number;
  @IsString() @MaxLength(50) codigo_servicio!: string;
  @IsString() @MaxLength(150) nombre!: string;
  @IsOptional() @IsString() tiempo_estimado?: string;
  @IsOptional() @IsBoolean() es_internacional?: boolean;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class UpdateServicioEnvioDto extends PartialType(CreateServicioEnvioDto) {}

export class CreateIntegracionEnvioDto {
  @IsInt() @Type(() => Number) id_transportista!: number;
  @IsOptional() @IsString() @MaxLength(20) entorno?: string;
  @IsOptional() @IsString() api_url?: string;
  @IsOptional() api_key?: string;
  @IsOptional() api_secret?: string;
  @IsOptional() credenciales_extra?: Record<string, unknown>;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class UpdateIntegracionEnvioDto extends PartialType(CreateIntegracionEnvioDto) {}

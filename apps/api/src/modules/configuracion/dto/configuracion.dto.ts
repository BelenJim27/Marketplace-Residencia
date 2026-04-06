import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConfiguracionSistemaDto {
  @IsString() @MaxLength(100) clave!: string;
  @IsOptional() @IsString() valor?: string;
  @IsOptional() @IsString() @MaxLength(20) tipo?: string;
  @IsOptional() @IsString() @MaxLength(255) descripcion?: string;
}

export class UpdateConfiguracionSistemaDto extends PartialType(CreateConfiguracionSistemaDto) {}

export class CreateTasaImpuestoDto {
  @IsString() @MaxLength(2) pais_iso2!: string;
  @IsOptional() @IsInt() @Type(() => Number) id_categoria?: number;
  @IsString() @MaxLength(20) tipo!: string;
  @IsString() @MaxLength(150) nombre!: string;
  @IsOptional() tasa_porcentaje?: string;
  @IsOptional() monto_fijo?: string;
  @IsOptional() @IsString() @MaxLength(3) moneda_monto_fijo?: string;
  @IsOptional() @IsDateString() vigente_hasta?: string;
  @IsOptional() @IsBoolean() incluido_en_precio?: boolean;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateTasaImpuestoDto extends PartialType(CreateTasaImpuestoDto) {}

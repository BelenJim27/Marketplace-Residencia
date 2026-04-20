import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductorDto {
  @IsString() id_usuario!: string;
  @IsOptional() @IsInt() @Type(() => Number) id_region?: number;
  @IsOptional() @IsString() biografia?: string;
}

export class UpdateProductorDto extends PartialType(CreateProductorDto) {}

export class SolicitarProductorDto {
  @IsString() id_usuario!: string;
  @IsOptional() @IsInt() @Type(() => Number) id_region?: number;
  @IsOptional() @IsString() biografia?: string;
  @IsString() certificado_url!: string;
}

export class RevisarSolicitudDto {
  @IsString() estado!: 'aprobado' | 'rechazado';
  @IsOptional() @IsString() motivo_rechazo?: string;
}

export class CreateRegionDto {
  @IsString() @MaxLength(150) nombre!: string;
  @IsOptional() @IsString() @MaxLength(100) estado_prov?: string;
  @IsOptional() @IsString() @MaxLength(2) pais_iso2?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateRegionDto extends PartialType(CreateRegionDto) {}

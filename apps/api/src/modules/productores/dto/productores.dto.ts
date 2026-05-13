import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
export class CreateProductorDto {
  @IsString() id_usuario!: string;
  @IsOptional() @IsInt() @Type(() => Number) id_region?: number;
  @IsOptional() @IsString() biografia?: string;
}

export class UpdateProductorDto extends PartialType(CreateProductorDto) {}

export class DireccionFiscalDto {
  @IsOptional() @IsString() @MaxLength(200) linea_1?: string;
  @IsOptional() @IsString() @MaxLength(200) linea_2?: string;
  @IsOptional() @IsString() @MaxLength(100) ciudad?: string;
  @IsOptional() @IsString() @MaxLength(100) estado?: string;
  @IsOptional() @IsString() @MaxLength(20) codigo_postal?: string;
  @IsOptional() @IsString() @MaxLength(2) pais_iso2?: string;
  @IsOptional() @IsString() referencia?: string;
  @IsOptional() @ValidateNested() ubicacion?: Record<string, unknown>;
  @IsOptional() @IsBoolean() es_internacional?: boolean;
}

export class DireccionProduccionDto {
  @IsOptional() @IsString() @MaxLength(200) linea_1?: string;
  @IsOptional() @IsString() @MaxLength(200) linea_2?: string;
  @IsOptional() @IsString() @MaxLength(100) ciudad?: string;
  @IsOptional() @IsString() @MaxLength(100) estado?: string;
  @IsOptional() @IsString() @MaxLength(20) codigo_postal?: string;
  @IsOptional() @IsString() @MaxLength(2) pais_iso2?: string;
  @IsOptional() @IsString() referencia?: string;
  @IsOptional() @ValidateNested() ubicacion?: Record<string, unknown>;
  @IsOptional() @IsBoolean() es_internacional?: boolean;
}

export class SolicitarProductorDto {
  @IsOptional() @IsInt() @Type(() => Number) id_region?: number;
  @IsOptional() @IsString() @MaxLength(13) rfc?: string;
  @IsOptional() @IsString() @MaxLength(200) razon_social?: string;
  @IsOptional() @ValidateNested() @Type(() => DireccionFiscalDto) direccion_fiscal?: DireccionFiscalDto;
  @IsOptional() @ValidateNested() @Type(() => DireccionProduccionDto) direccion_produccion?: DireccionProduccionDto;
  @IsOptional() @IsString() datos_bancarios?: string;
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  categorias_ids?: number[];
}

export class RevisarSolicitudDto {
  @IsString() estado!: 'aprobado' | 'rechazado';
  @IsOptional() @IsString() motivo_rechazo?: string;
  @IsOptional() @IsString() motivo_aprobacion?: string;
}

export class CreateRegionDto {
  @IsString() @MaxLength(150) nombre!: string;
  @IsOptional() @IsString() @MaxLength(100) estado_prov?: string;
  @IsOptional() @IsString() @MaxLength(2) pais_iso2?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateRegionDto extends PartialType(CreateRegionDto) {}

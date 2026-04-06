import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLoteDto {
  @IsInt() @Type(() => Number) id_productor!: number;
  @IsOptional() @IsInt() @Type(() => Number) id_region?: number;
  @IsString() @MaxLength(100) codigo_lote!: string;
  @IsOptional() @IsString() @MaxLength(200) sitio?: string;
  @IsOptional() @IsString() fecha_produccion?: string;
  @IsOptional() @IsInt() @Type(() => Number) volumen_total?: number;
  @IsOptional() @IsString() @MaxLength(30) estado_lote?: string;
  @IsOptional() @IsObject() datos_api?: Record<string, unknown>;
}
export class UpdateLoteDto extends PartialType(CreateLoteDto) {}

export class CreateLoteAtributoDto {
  @IsInt() @Type(() => Number) id_lote!: number;
  @IsString() @MaxLength(100) clave!: string;
  @IsOptional() @IsString() valor?: string;
  @IsOptional() @IsString() @MaxLength(50) unidad?: string;
  @IsOptional() @IsString() @MaxLength(50) fuente?: string;
}
export class UpdateLoteAtributoDto extends PartialType(CreateLoteAtributoDto) {}

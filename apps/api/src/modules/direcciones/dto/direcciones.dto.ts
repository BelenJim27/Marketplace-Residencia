import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateDireccionDto {
  @IsString() id_usuario!: string;
  @IsOptional() @IsString() @MaxLength(150) nombre_destinatario?: string | null;
  @IsOptional() @IsString() @MaxLength(30) telefono?: string | null;
  @IsOptional() @IsString() @MaxLength(60) nombre_etiqueta?: string | null;
  @IsOptional() @IsBoolean() es_predeterminada?: boolean;
  @IsOptional() @IsBoolean() es_internacional?: boolean;
  
  // Campos para direcciones nacionales (México)
  @IsOptional() @IsString() @MaxLength(200) calle?: string | null;
  @IsOptional() @IsString() @MaxLength(20) numero?: string | null;
  @IsOptional() @IsString() @MaxLength(150) colonia?: string | null;
  
  // Campos para direcciones internacionales
  @IsOptional() @IsString() @MaxLength(200) linea_1?: string | null;
  @IsOptional() @IsString() @MaxLength(200) linea_2?: string | null;
  
  // Campos comunes
  @IsOptional() @IsString() @MaxLength(100) ciudad?: string | null;
  @IsOptional() @IsString() @MaxLength(100) estado?: string | null;
  @IsOptional() @IsString() @MaxLength(20) codigo_postal?: string | null;
  @IsOptional() @IsString() @Length(2, 2) pais_iso2?: string | null;
  @IsOptional() @IsString() referencia?: string | null;
  @IsOptional() @IsString() @MaxLength(20) tipo?: string | null;
  @IsOptional() ubicacion?: Record<string, unknown> | null;
}
export class UpdateDireccionDto extends PartialType(CreateDireccionDto) {}

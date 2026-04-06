import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDireccionDto {
  @IsString() id_usuario!: string;
  @IsOptional() ubicacion?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(200) linea_1?: string;
  @IsOptional() @IsString() @MaxLength(200) linea_2?: string;
  @IsOptional() @IsString() referencia?: string;
  @IsOptional() @IsString() @MaxLength(20) tipo?: string;
  @IsOptional() @IsBoolean() es_internacional?: boolean;
}
export class UpdateDireccionDto extends PartialType(CreateDireccionDto) {}

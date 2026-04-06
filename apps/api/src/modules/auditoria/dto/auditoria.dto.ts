import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAuditoriaDto {
  @IsOptional() @IsString() id_usuario?: string;
  @IsString() @MaxLength(50) accion!: string;
  @IsString() @MaxLength(100) tabla_afectada!: string;
  @IsOptional() @IsString() registro_id?: string;
  @IsOptional() valor_anterior?: Record<string, unknown>;
  @IsOptional() valor_nuevo?: Record<string, unknown>;
  @IsOptional() @IsString() ip_origen?: string;
}
export class UpdateAuditoriaDto extends PartialType(CreateAuditoriaDto) {}

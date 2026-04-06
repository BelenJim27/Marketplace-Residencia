import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNotificacionDto {
  @IsString() id_usuario!: string;
  @IsString() @MaxLength(60) tipo!: string;
  @IsString() @MaxLength(255) titulo!: string;
  @IsOptional() @IsString() cuerpo?: string;
  @IsOptional() @IsString() url_accion?: string;
  @IsOptional() @IsBoolean() leido?: boolean;
}
export class UpdateNotificacionDto extends PartialType(CreateNotificacionDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateArchivoDto {
  @IsString() @MaxLength(30) entidad_tipo!: string;
  @IsOptional() @IsInt() @Type(() => Number) entidad_id?: number;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() @MaxLength(50) tipo?: string;
  @IsOptional() @IsString() @MaxLength(20) estado?: string;
  @IsOptional() @IsString() validado_por?: string;
  @IsOptional() @IsString() @MaxLength(120) nombre?: string;
}
export class UpdateArchivoDto extends PartialType(CreateArchivoDto) {}

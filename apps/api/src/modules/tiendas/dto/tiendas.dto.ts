import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTiendaDto {
  @IsInt() @Type(() => Number) id_productor!: number;
  @IsString() @MaxLength(150) nombre!: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() @MaxLength(2) pais_operacion?: string;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
}
export class UpdateTiendaDto extends PartialType(CreateTiendaDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateResenaDto {
  @IsString() id_usuario!: string;
  @IsInt() @Type(() => Number) id_producto!: number;
  @IsInt() @Min(1) @Max(5) calificacion!: number;
  @IsOptional() @IsString() comentario?: string;
  @IsOptional() @IsString() idioma_comentario?: string;
  @IsOptional() @IsBoolean() compra_verificada?: boolean;
  @IsOptional() @IsString() respuesta_vendedor?: string;
}
export class UpdateResenaDto extends PartialType(CreateResenaDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInventarioDto {
  @IsInt() @Type(() => Number) id_producto!: number;
  @IsInt() @Type(() => Number) stock!: number;
  @IsOptional() @IsInt() @Type(() => Number) stock_minimo?: number;
}
export class UpdateInventarioDto extends PartialType(CreateInventarioDto) {}

export class CreateMovimientoInventarioDto {
  @IsInt() @Type(() => Number) id_inventario!: number;
  @IsOptional() @IsString() id_usuario?: string;
  @IsString() @MaxLength(30) tipo!: string;
  @IsInt() @Type(() => Number) cantidad!: number;
  @IsInt() @Type(() => Number) stock_resultante!: number;
  @IsOptional() @IsString() motivo?: string;
  @IsOptional() @IsInt() @Type(() => Number) id_pedido?: number;
}

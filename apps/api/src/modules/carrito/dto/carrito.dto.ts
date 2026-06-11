import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsNumberString, IsUUID, IsOptional, IsString, Min } from 'class-validator';

export class CreateCarritoItemDto {
  @IsUUID() id_usuario!: string;
  @IsInt() @Type(() => Number) id_producto!: number;
  @IsInt() @Min(1) @Type(() => Number) cantidad!: number;
  @IsNumberString() precio_unitario_snapshot!: string;
  @IsOptional() @IsString() moneda_snapshot?: string;
}
export class UpdateCarritoItemDto extends PartialType(CreateCarritoItemDto) {}

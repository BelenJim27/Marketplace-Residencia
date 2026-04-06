import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsNumberString } from 'class-validator';

export class CreateCarritoItemDto {
  id_usuario!: string;
  @IsInt() @Type(() => Number) id_producto!: number;
  @IsInt() @Type(() => Number) cantidad!: number;
  @IsNumberString() precio_unitario_snapshot!: string;
  moneda_snapshot?: string;
}
export class UpdateCarritoItemDto extends PartialType(CreateCarritoItemDto) {}

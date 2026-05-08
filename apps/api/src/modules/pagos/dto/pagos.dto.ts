import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreatePagoDto {
  @IsInt() @Type(() => Number) id_pedido!: number;
  @IsOptional() @IsString() proveedor?: string;
  @IsOptional() @IsString() payment_intent_id?: string;
  @IsOptional() @IsString() @MaxLength(50) estado?: string;
  @IsString() monto!: string;
  @IsString() @MaxLength(3) moneda!: string;
}
export class UpdatePagoDto extends PartialType(CreatePagoDto) {}

export class CreateMonedaDto {
  @IsString() @MaxLength(3) codigo!: string;
  @IsString() @MaxLength(100) nombre!: string;
  @IsOptional() @IsString() @MaxLength(10) simbolo?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class UpdateMonedaDto extends PartialType(CreateMonedaDto) {}

export class StripeShippingAddressDto {
  @IsString() line1!: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() city!: string;
  @IsString() @MaxLength(10) state!: string;
  @IsString() @MaxLength(20) postal_code!: string;
  @IsString() @Length(2, 2) country!: string;
}

export class CreateStripeIntentDto {
  @IsString() id_pedido!: string;
  @IsNumber() @Min(0.01) @Type(() => Number) subtotal!: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) shipping_amount?: number;
  @IsString() @Length(3, 3) moneda!: string;
  @ValidateNested() @Type(() => StripeShippingAddressDto) shipping_address!: StripeShippingAddressDto;
  @IsOptional() @IsString() recipient_name?: string;
  @IsOptional() @IsString() customer_id?: string;
  @IsOptional() @IsBoolean() automatic_tax?: boolean;
}

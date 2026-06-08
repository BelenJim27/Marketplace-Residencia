import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumberString, IsOptional, IsString, Length, MaxLength, Min, registerDecorator, ValidationOptions } from 'class-validator';

function IsNonNegativeDecimal(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isNonNegativeDecimal',
      target: (object as any).constructor,
      propertyName,
      options: { message: `${propertyName} debe ser un número >= 0`, ...options },
      validator: {
        validate(value: any) {
          return typeof value === 'string' && !isNaN(Number(value)) && Number(value) >= 0;
        },
      },
    });
}

export class CreateComisionDto {
  @IsIn(['global', 'pais', 'categoria', 'productor'])
  alcance!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_iso2?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_categoria?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_productor?: number;

  @IsNumberString()
  @IsNonNegativeDecimal()
  porcentaje!: string;

  @IsOptional()
  @IsNumberString()
  @IsNonNegativeDecimal()
  monto_fijo?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda_monto_fijo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  prioridad?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo?: boolean;
}

export class UpdateComisionDto extends PartialType(CreateComisionDto) {}

export class ResolverComisionQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_productor?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_categoria?: number;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_iso2?: string;
}

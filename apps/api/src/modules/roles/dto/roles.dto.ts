import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRolDto {
  @IsString()
  @MaxLength(100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  estado?: string;
}

export class UpdateRolDto extends PartialType(CreateRolDto) {}

export class CreatePermisoDto {
  @IsString()
  @MaxLength(100)
  nombre!: string;
}

export class UpdatePermisoDto extends PartialType(CreatePermisoDto) {}

export class AssignPermisoDto {
  @IsInt()
  @Type(() => Number)
  id_permiso!: number;
}

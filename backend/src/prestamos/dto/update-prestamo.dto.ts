import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EstadoPrestamo } from '../../common/enums/estado-prestamo.enum';
import { CreatePrestamoDto } from './create-prestamo.dto';

export class UpdatePrestamoDto extends PartialType(CreatePrestamoDto) {
  @IsEnum(EstadoPrestamo)
  @IsOptional()
  estado?: EstadoPrestamo;

  @IsDateString()
  @IsOptional()
  fechaDevolucion?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdatePagoCuotaDto {
  @ApiPropertyOptional({ description: 'Nuevo monto del pago' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  monto?: number;

  @ApiPropertyOptional({ description: 'Nueva fecha del pago (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fechaPago?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;
}

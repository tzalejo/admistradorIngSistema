import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive } from 'class-validator';

export class PagarCuotaDto {
  @ApiProperty({ description: 'Monto a pagar (puede ser parcial o exceder la cuota)' })
  @IsNumber()
  @IsPositive()
  monto: number;

  @ApiProperty({ description: 'Fecha del pago (YYYY-MM-DD)' })
  @IsDateString()
  fechaPago: string;
}

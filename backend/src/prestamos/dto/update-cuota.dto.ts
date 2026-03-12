import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { EstadoCuota } from '../../common/enums/estado-cuota.enum';

export class UpdateCuotaDto {
  @ApiPropertyOptional({ description: 'Nueva tasa aplicada para este mes' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  tasaAplicada?: number;

  @ApiPropertyOptional({ description: 'Nuevo monto de pago' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  montoPago?: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @ApiPropertyOptional({ description: 'Fecha en que se pagó efectivamente' })
  @IsDateString()
  @IsOptional()
  fechaPagoReal?: string;

  @ApiPropertyOptional({ enum: EstadoCuota })
  @IsEnum(EstadoCuota)
  @IsOptional()
  estado?: EstadoCuota;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notas?: string;
}

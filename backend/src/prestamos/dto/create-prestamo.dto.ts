import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TasaTipo } from '../../common/enums/tasa-tipo.enum';

export class CreatePrestamoDto {
  @ApiProperty({ description: 'Nombre del prestamista' })
  @IsString()
  @IsNotEmpty()
  cliente: string;

  @ApiProperty({ description: 'Monto recibido' })
  @IsNumber()
  @IsPositive()
  montoInicial: number;

  @ApiProperty({ description: 'Código de moneda (ej: ARS, USDT, BTC)' })
  @IsString()
  @IsNotEmpty()
  moneda: string;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ description: 'Plazo en meses' })
  @IsInt()
  @Min(1)
  plazoMeses: number;

  @ApiProperty({ enum: TasaTipo, description: 'Tipo de tasa: porcentaje o fijo' })
  @IsEnum(TasaTipo)
  tasaTipo: TasaTipo;

  @ApiProperty({
    description: 'Tasa inicial (% mensual si tipo=porcentaje, o monto fijo si tipo=fijo)',
  })
  @IsNumber()
  @IsPositive()
  tasaInicial: number;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notas?: string;
}

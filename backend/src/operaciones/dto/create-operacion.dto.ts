import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { TipoOperacion } from '../../common/enums/tipo-operacion.enum';

export class CreateOperacionDto {
  @ApiProperty({ enum: TipoOperacion, description: 'Tipo: compra, venta, gasto o ingreso' })
  @IsEnum(TipoOperacion)
  tipo: TipoOperacion;

  @ApiProperty({ description: 'Código de moneda origen (ej: ARS, USDT)' })
  @IsString()
  @IsNotEmpty()
  monedaOrigen: string;

  @ApiPropertyOptional({ description: 'Código de moneda destino (no aplica para gastos ni ingresos)' })
  @ValidateIf((o) => o.tipo !== TipoOperacion.GASTO && o.tipo !== TipoOperacion.INGRESO)
  @IsString()
  @IsNotEmpty()
  monedaDestino?: string;

  @ApiProperty({ description: 'Cantidad de moneda entregada / monto del gasto / monto del ingreso' })
  @IsNumber()
  @IsPositive()
  montoOrigen: number;

  @ApiPropertyOptional({ description: 'Tasa de cambio aplicada (no aplica para gastos ni ingresos)' })
  @ValidateIf((o) => o.tipo !== TipoOperacion.GASTO && o.tipo !== TipoOperacion.INGRESO)
  @IsNumber()
  @IsPositive()
  tasaCambio?: number;

  @ApiPropertyOptional({ description: 'Cantidad de moneda recibida (no aplica para gastos ni ingresos)' })
  @ValidateIf((o) => o.tipo !== TipoOperacion.GASTO && o.tipo !== TipoOperacion.INGRESO)
  @IsNumber()
  @IsPositive()
  montoDestino?: number;

  @ApiProperty({ description: 'Fecha de la operación (YYYY-MM-DD)' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ description: 'Hora de la operación (HH:MM)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'hora debe tener formato HH:MM' })
  hora: string;

  @ApiPropertyOptional({ description: 'Notas / concepto del gasto' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  notas?: string;
}

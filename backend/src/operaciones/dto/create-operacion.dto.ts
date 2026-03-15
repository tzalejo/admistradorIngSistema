import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { TipoOperacion } from '../../common/enums/tipo-operacion.enum';

export class CreateOperacionDto {
  @ApiProperty({ enum: TipoOperacion, description: 'Tipo: compra, venta o gasto' })
  @IsEnum(TipoOperacion)
  tipo: TipoOperacion;

  @ApiProperty({ description: 'Código de moneda origen (ej: ARS, USDT)' })
  @IsString()
  @IsNotEmpty()
  monedaOrigen: string;

  @ApiPropertyOptional({ description: 'Código de moneda destino (no aplica para gastos)' })
  @ValidateIf((o) => o.tipo !== TipoOperacion.GASTO)
  @IsString()
  @IsNotEmpty()
  monedaDestino?: string;

  @ApiProperty({ description: 'Cantidad de moneda entregada / monto del gasto' })
  @IsNumber()
  @IsPositive()
  montoOrigen: number;

  @ApiPropertyOptional({ description: 'Tasa de cambio aplicada (no aplica para gastos)' })
  @ValidateIf((o) => o.tipo !== TipoOperacion.GASTO)
  @IsNumber()
  @IsPositive()
  tasaCambio?: number;

  @ApiPropertyOptional({ description: 'Cantidad de moneda recibida (no aplica para gastos)' })
  @ValidateIf((o) => o.tipo !== TipoOperacion.GASTO)
  @IsNumber()
  @IsPositive()
  montoDestino?: number;

  @ApiProperty({ description: 'Fecha de la operación (YYYY-MM-DD)' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ description: 'Notas / concepto del gasto' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  notas?: string;
}

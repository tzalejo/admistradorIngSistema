import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CierreCajaService } from './cierre-caja.service';

@ApiTags('Cierre de caja')
@Controller('cierre-caja')
export class CierreCajaController {
  constructor(private readonly service: CierreCajaService) {}

  @Post()
  @ApiOperation({ summary: 'Genera o pisa el cierre de caja de hoy' })
  cerrar() {
    return this.service.cerrar();
  }

  @Get()
  @ApiOperation({ summary: 'Historial de cierres de caja ordenado por fecha desc' })
  getHistorial() {
    return this.service.getHistorial();
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen general: capitales, intereses pendientes, próximas cuotas' })
  getResumen() {
    return this.dashboardService.getResumen();
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Todos los movimientos en formato debe/haber' })
  getMovimientos() {
    return this.dashboardService.getMovimientos();
  }

  @Get('caja')
  @ApiOperation({ summary: 'Saldo real por moneda en caja (capital ± operaciones ± intereses pagados)' })
  getCaja() {
    return this.dashboardService.getCajaPorMoneda();
  }

}

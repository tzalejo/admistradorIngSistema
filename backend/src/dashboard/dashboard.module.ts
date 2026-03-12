import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrestamosModule } from '../prestamos/prestamos.module';
import { OperacionesModule } from '../operaciones/operaciones.module';
import { MonedasModule } from '../monedas/monedas.module';

@Module({
  imports: [PrestamosModule, OperacionesModule, MonedasModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

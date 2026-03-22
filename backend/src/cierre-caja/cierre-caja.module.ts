import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CierreCaja } from './entities/cierre-caja.entity';
import { CierreCajaService } from './cierre-caja.service';
import { CierreCajaController } from './cierre-caja.controller';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MonedasModule } from '../monedas/monedas.module';

@Module({
  imports: [TypeOrmModule.forFeature([CierreCaja]), DashboardModule, MonedasModule],
  controllers: [CierreCajaController],
  providers: [CierreCajaService],
})
export class CierreCajaModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosController } from './prestamos.controller';
import { PrestamosService } from './prestamos.service';
import { Prestamo } from './entities/prestamo.entity';
import { CuotaInteres } from './entities/cuota-interes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Prestamo, CuotaInteres])],
  controllers: [PrestamosController],
  providers: [PrestamosService],
  exports: [PrestamosService, TypeOrmModule],
})
export class PrestamosModule {}

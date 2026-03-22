import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperacionesController } from './operaciones.controller';
import { OperacionesService } from './operaciones.service';
import { Operacion } from './entities/operacion.entity';
import { Prestamo } from '../prestamos/entities/prestamo.entity';
import { CuotaInteres } from '../prestamos/entities/cuota-interes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Operacion, Prestamo, CuotaInteres])],
  controllers: [OperacionesController],
  providers: [OperacionesService],
  exports: [OperacionesService, TypeOrmModule],
})
export class OperacionesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperacionesController } from './operaciones.controller';
import { OperacionesService } from './operaciones.service';
import { Operacion } from './entities/operacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Operacion])],
  controllers: [OperacionesController],
  providers: [OperacionesService],
  exports: [OperacionesService, TypeOrmModule],
})
export class OperacionesModule {}

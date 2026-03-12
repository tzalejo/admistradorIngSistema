import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonedasController } from './monedas.controller';
import { MonedasService } from './monedas.service';
import { Moneda } from './entities/moneda.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Moneda])],
  controllers: [MonedasController],
  providers: [MonedasService],
  exports: [MonedasService],
})
export class MonedasModule {}

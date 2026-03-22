import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Moneda } from './entities/moneda.entity';

const SEED_MONEDAS = [
  { codigo: 'ARS', nombre: 'Peso Argentino' },
  { codigo: 'USDT', nombre: 'Tether USD' },
  { codigo: 'USD', nombre: 'Dólar Estadounidense' },
];

@Injectable()
export class MonedasService implements OnModuleInit {
  constructor(
    @InjectRepository(Moneda)
    private readonly monedaRepo: Repository<Moneda>,
  ) {}

  async onModuleInit() {
    const count = await this.monedaRepo.count();
    if (count === 0) {
      await this.monedaRepo.save(SEED_MONEDAS);
    }
  }

  findAll(): Promise<Moneda[]> {
    return this.monedaRepo.find({ order: { codigo: 'ASC' } });
  }

  async getCodigos(): Promise<string[]> {
    const monedas = await this.findAll();
    return monedas.map((m) => m.codigo);
  }
}

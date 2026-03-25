import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Moneda } from './entities/moneda.entity';

const SEED_MONEDAS = [
  { codigo: 'ARS', nombre: 'Peso Argentino' },
  { codigo: 'USDT', nombre: 'Tether USD' },
  { codigo: 'USD', nombre: 'Dólar Estadounidense' },
];

const CACHE_KEY_MONEDAS = 'monedas';

@Injectable()
export class MonedasService implements OnModuleInit {
  private readonly logger = new Logger(MonedasService.name);

  constructor(
    @InjectRepository(Moneda)
    private readonly monedaRepo: Repository<Moneda>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async onModuleInit() {
    const count = await this.monedaRepo.count();
    if (count === 0) {
      await this.monedaRepo.save(SEED_MONEDAS);
      this.logger.log(`Monedas sembradas: ${SEED_MONEDAS.map((m) => m.codigo).join(', ')}`);
    }
    // Pre-calienta el cache desde la DB al arrancar
    await this.findAll();
  }

  async findAll(): Promise<Moneda[]> {
    const cached = await this.cache.get<Moneda[]>(CACHE_KEY_MONEDAS);
    if (cached) return cached;
    const monedas = await this.monedaRepo.find({ order: { codigo: 'ASC' } });
    await this.cache.set(CACHE_KEY_MONEDAS, monedas, 24 * 60 * 60 * 1000); // 24h
    this.logger.debug(`Cache de monedas cargado desde DB (${monedas.length} registros)`);
    return monedas;
  }

  async getCodigos(): Promise<string[]> {
    const monedas = await this.findAll();
    return monedas.map((m) => m.codigo);
  }
}

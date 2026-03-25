import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { CierreCaja } from './entities/cierre-caja.entity';
import { DashboardService } from '../dashboard/dashboard.service';
import { MonedasService } from '../monedas/monedas.service';

@Injectable()
export class CierreCajaService {
  private readonly logger = new Logger(CierreCajaService.name);

  constructor(
    @InjectRepository(CierreCaja)
    private readonly repo: Repository<CierreCaja>,
    private readonly dashboardService: DashboardService,
    private readonly monedasService: MonedasService,
  ) {}

  async cerrar(): Promise<CierreCaja[]> {
    const today = new Date().toISOString().slice(0, 10);

    const [caja, todosMovimientos, todasMonedas] = await Promise.all([
      this.dashboardService.getCajaPorMoneda(),
      this.dashboardService.getMovimientos(),
      this.monedasService.findAll(), // ya viene cacheado desde MonedasService
    ]);

    // Índice código → entidad Moneda
    const monedaMap = new Map(todasMonedas.map((m) => [m.codigo, m]));
    const codigos = todasMonedas.map((m) => m.codigo);

    // Movimientos de hoy
    const movimientosHoy = todosMovimientos.filter(
      (m) => new Date(m.fecha).toISOString().slice(0, 10) === today,
    );

    // Acumular entradas/salidas por código de moneda
    const entradas: Record<string, number> = Object.fromEntries(codigos.map((c) => [c, 0]));
    const salidas: Record<string, number> = Object.fromEntries(codigos.map((c) => [c, 0]));

    for (const m of movimientosHoy) {
      if (!codigos.includes(m.moneda)) continue;
      if (m.haber !== null) entradas[m.moneda] += m.haber;
      if (m.debe !== null) salidas[m.moneda] += m.debe;
    }

    for (const codigo of codigos) {
      const moneda = monedaMap.get(codigo);
      if (!moneda) continue;

      const existing = await this.repo.findOneBy({ fecha: today, idMoneda: moneda.id });
      const cierre = existing ?? this.repo.create({ fecha: today, idMoneda: moneda.id });
      cierre.saldo = caja[codigo] ?? 0;
      cierre.entrada = entradas[codigo] ?? 0;
      cierre.salida = salidas[codigo] ?? 0;
      await this.repo.save(cierre);
    }

    // Recargar con la relación moneda incluida (eager)
    const saved = await this.repo.find({
      where: { fecha: today },
      order: { idMoneda: 'ASC' },
    });

    this.logger.log(`Cierre de caja generado para ${today}`);
    return saved;
  }

  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async cerrarAutomatico(): Promise<void> {
    this.logger.log('Ejecutando cierre de caja automático (23:00)...');
    try {
      await this.cerrar();
    } catch (error) {
      this.logger.error('Error en cierre de caja automático', error);
    }
  }

  async getHistorial(): Promise<CierreCaja[]> {
    return this.repo.find({ order: { fecha: 'DESC', idMoneda: 'ASC' } });
  }
}

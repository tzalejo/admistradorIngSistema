import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Between, Repository } from 'typeorm';
import { Prestamo } from '../prestamos/entities/prestamo.entity';
import { CuotaInteres } from '../prestamos/entities/cuota-interes.entity';
import { PagoCuota } from '../prestamos/entities/pago-cuota.entity';
import { Operacion } from '../operaciones/entities/operacion.entity';
import { EstadoPrestamo } from '../common/enums/estado-prestamo.enum';
import { EstadoCuota } from '../common/enums/estado-cuota.enum';
import { MonedasService } from '../monedas/monedas.service';

export interface Movimiento {
  id: string;
  fecha: Date;
  hora?: string;
  descripcion: string;
  tipo: 'ingreso' | 'egreso' | 'compra' | 'venta' | 'pago_interes' | 'devolucion' | 'gasto' | 'ingreso_efectivo';
  moneda: string;
  debe: number | null;
  haber: number | null;
  referenciaTipo: 'prestamo' | 'cuota' | 'operacion';
  referenciaId: number;
  cliente?: string;
}

export interface ResumenDashboard {
  prestamosActivos: number;
  capitalTotalPorMoneda: Record<string, number>;
  interesesPendientesPorMoneda: Record<string, number>;
  interesesPagadosPorMoneda: Record<string, number>;
  operacionesTotales: number;
  proximasCuotas: Array<{
    cuotaId: number;
    prestamoId: number;
    cliente: string;
    mesNumero: number;
    montoPago: number;
    moneda: string;
    fechaVencimiento: Date;
  }>;
}

const CACHE_KEY_MOVIMIENTOS = 'dashboard:movimientos';
const CACHE_KEY_CAJA = 'dashboard:caja';
const CACHE_KEY_RESUMEN = 'dashboard:resumen';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Prestamo)
    private readonly prestamoRepo: Repository<Prestamo>,
    @InjectRepository(CuotaInteres)
    private readonly cuotaRepo: Repository<CuotaInteres>,
    @InjectRepository(PagoCuota)
    private readonly pagoRepo: Repository<PagoCuota>,
    @InjectRepository(Operacion)
    private readonly operacionRepo: Repository<Operacion>,
    private readonly monedasService: MonedasService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getMovimientos(): Promise<Movimiento[]> {
    const cached = await this.cache.get<Movimiento[]>(CACHE_KEY_MOVIMIENTOS);
    if (cached) return cached;

    const movimientos: Movimiento[] = [];

    // 1. Ingresos por préstamos recibidos
    const prestamos = await this.prestamoRepo.find({ order: { fechaInicio: 'ASC' } });
    for (const p of prestamos) {
      movimientos.push({
        id: `prestamo-ingreso-${p.id}`,
        fecha: p.fechaInicio,
        descripcion: `Préstamo recibido de ${p.cliente}`,
        tipo: 'ingreso',
        moneda: p.moneda,
        debe: null,
        haber: p.montoInicial,
        referenciaTipo: 'prestamo',
        referenciaId: p.id,
        cliente: p.cliente,
      });

      if (p.estado === EstadoPrestamo.DEVUELTO && p.fechaDevolucion) {
        movimientos.push({
          id: `prestamo-devolucion-${p.id}`,
          fecha: p.fechaDevolucion,
          descripcion: `Devolución de capital a ${p.cliente}`,
          tipo: 'devolucion',
          moneda: p.moneda,
          debe: p.montoInicial,
          haber: null,
          referenciaTipo: 'prestamo',
          referenciaId: p.id,
          cliente: p.cliente,
        });
      }
    }

    // 2. Pagos de intereses (registros individuales de pagos_cuota)
    const pagos = await this.pagoRepo
      .createQueryBuilder('pago')
      .leftJoinAndSelect('pago.cuota', 'cuota')
      .leftJoinAndSelect('cuota.prestamo', 'prestamo')
      .orderBy('pago.fechaPago', 'ASC')
      .getMany();
    for (const p of pagos) {
      const cuota = p.cuota;
      const prestamo = cuota?.prestamo;
      const cliente = prestamo?.cliente ?? '';
      movimientos.push({
        id: `pago-${p.id}`,
        fecha: p.fechaPago,
        descripcion: `Pago interés mes ${cuota?.mesNumero ?? '?'}${cliente ? ` - ${cliente}` : ''}`,
        tipo: 'pago_interes',
        moneda: prestamo?.moneda ?? 'ARS',
        debe: p.monto,
        haber: null,
        referenciaTipo: 'cuota',
        referenciaId: cuota?.id ?? 0,
        cliente: prestamo?.cliente,
      });
    }

    // 3. Operaciones de compra/venta/gasto
    const operaciones = await this.operacionRepo.find({ order: { fecha: 'ASC' } });
    for (const op of operaciones) {
      if (op.tipo === 'ingreso') {
        movimientos.push({
          id: `op-ingreso-${op.id}`,
          fecha: op.fecha,
          hora: op.hora ?? undefined,
          descripcion: op.notas ? `Ingreso: ${op.notas}` : `Ingreso ${op.monedaOrigen}`,
          tipo: 'ingreso_efectivo',
          moneda: op.monedaOrigen,
          debe: null,
          haber: op.montoOrigen,
          referenciaTipo: 'operacion',
          referenciaId: op.id,
        });
      } else if (op.tipo === 'gasto') {
        movimientos.push({
          id: `op-gasto-${op.id}`,
          fecha: op.fecha,
          hora: op.hora ?? undefined,
          descripcion: op.notas ? `Gasto: ${op.notas}` : `Gasto ${op.monedaOrigen}`,
          tipo: 'gasto',
          moneda: op.monedaOrigen,
          debe: op.montoOrigen,
          haber: null,
          referenciaTipo: 'operacion',
          referenciaId: op.id,
        });
      } else {
        movimientos.push({
          id: `op-salida-${op.id}`,
          fecha: op.fecha,
          hora: op.hora ?? undefined,
          descripcion: `Cambio ${op.monedaOrigen} → ${op.monedaDestino} (entrega)`,
          tipo: op.tipo === 'compra' ? 'compra' : 'venta',
          moneda: op.monedaOrigen,
          debe: op.montoOrigen,
          haber: null,
          referenciaTipo: 'operacion',
          referenciaId: op.id,
        });
        movimientos.push({
          id: `op-entrada-${op.id}`,
          fecha: op.fecha,
          hora: op.hora ?? undefined,
          descripcion: `Cambio ${op.monedaOrigen} → ${op.monedaDestino} @ ${op.tasaCambio}`,
          tipo: op.tipo === 'compra' ? 'compra' : 'venta',
          moneda: op.monedaDestino!,
          debe: null,
          haber: op.montoDestino,
          referenciaTipo: 'operacion',
          referenciaId: op.id,
        });
      }
    }

    movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    await this.cache.set(CACHE_KEY_MOVIMIENTOS, movimientos, 5 * 60 * 1000); // 5 min
    return movimientos;
  }

  async getResumen(): Promise<ResumenDashboard> {
    const cached = await this.cache.get<ResumenDashboard>(CACHE_KEY_RESUMEN);
    if (cached) return cached;

    const [prestamosActivos, codigos] = await Promise.all([
      this.prestamoRepo.find({
        where: { estado: EstadoPrestamo.ACTIVO },
        relations: ['cuotas'],
      }),
      this.monedasService.getCodigos(),
    ]);

    const capitalTotalPorMoneda: Record<string, number> = {};
    const interesesPendientesPorMoneda: Record<string, number> = {};
    const interesesPagadosPorMoneda: Record<string, number> = {};

    for (const codigo of codigos) {
      capitalTotalPorMoneda[codigo] = 0;
      interesesPendientesPorMoneda[codigo] = 0;
      interesesPagadosPorMoneda[codigo] = 0;
    }

    for (const p of prestamosActivos) {
      capitalTotalPorMoneda[p.moneda] = (capitalTotalPorMoneda[p.moneda] ?? 0) + p.montoInicial;
      for (const c of p.cuotas ?? []) {
        interesesPagadosPorMoneda[p.moneda] = (interesesPagadosPorMoneda[p.moneda] ?? 0) + c.montoPagado;
        const pendiente = c.montoPago - c.montoPagado;
        if (pendiente > 0) {
          interesesPendientesPorMoneda[p.moneda] = (interesesPendientesPorMoneda[p.moneda] ?? 0) + pendiente;
        }
      }
    }

    const operacionesTotales = await this.operacionRepo.count();

    // Rango: desde el 1° del mes actual hasta el último día del mes siguiente
    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);

    const proximasCuotasRaw = await this.cuotaRepo.find({
      where: [
        { estado: EstadoCuota.PENDIENTE, fechaVencimiento: Between(inicioMesActual, finMesSiguiente) },
        { estado: EstadoCuota.PARCIAL, fechaVencimiento: Between(inicioMesActual, finMesSiguiente) },
      ],
      relations: ['prestamo'],
      order: { fechaVencimiento: 'ASC' },
    });

    const proximasCuotas = proximasCuotasRaw.map((c) => ({
      cuotaId: c.id,
      prestamoId: c.prestamoId,
      cliente: c.prestamo?.cliente ?? '',
      mesNumero: c.mesNumero,
      montoPago: c.montoPago,
      moneda: c.prestamo?.moneda ?? 'ARS',
      fechaVencimiento: c.fechaVencimiento,
    }));

    const resumen = {
      prestamosActivos: prestamosActivos.length,
      capitalTotalPorMoneda,
      interesesPendientesPorMoneda,
      interesesPagadosPorMoneda,
      operacionesTotales,
      proximasCuotas,
    };
    await this.cache.set(CACHE_KEY_RESUMEN, resumen, 5 * 60 * 1000); // 5 min
    return resumen;
  }

  /**
   * Calcula el saldo real de cada moneda en caja:
   *   + capital recibido de préstamos activos
   *   - capital devuelto de préstamos devueltos
   *   - montoOrigen de operaciones (lo que se entregó)
   *   + montoDestino de operaciones (lo que se recibió)
   *   - cuotas de interés ya pagadas
   */
  async getCajaPorMoneda(): Promise<Record<string, number>> {
    const cached = await this.cache.get<Record<string, number>>(CACHE_KEY_CAJA);
    if (cached) return cached;

    const [prestamos, operaciones, pagos, codigos] = await Promise.all([
      this.prestamoRepo.find(),
      this.operacionRepo.find(),
      this.pagoRepo.find({
        relations: ['cuota', 'cuota.prestamo'],
      }),
      this.monedasService.getCodigos(),
    ]);

    const caja: Record<string, number> = {};
    for (const codigo of codigos) caja[codigo] = 0;

    for (const p of prestamos) {
      // Capital recibido
      caja[p.moneda] = (caja[p.moneda] ?? 0) + p.montoInicial;
      // Capital devuelto
      if (p.estado === EstadoPrestamo.DEVUELTO) {
        caja[p.moneda] = (caja[p.moneda] ?? 0) - p.montoInicial;
      }
    }

    for (const op of operaciones) {
      if (op.tipo === 'ingreso') {
        caja[op.monedaOrigen] = (caja[op.monedaOrigen] ?? 0) + op.montoOrigen;
      } else {
        caja[op.monedaOrigen] = (caja[op.monedaOrigen] ?? 0) - op.montoOrigen;
        if (op.monedaDestino && op.montoDestino !== null) {
          caja[op.monedaDestino] = (caja[op.monedaDestino] ?? 0) + op.montoDestino;
        }
      }
    }

    // Pagos de intereses individuales
    for (const pago of pagos) {
      const moneda = pago.cuota?.prestamo?.moneda;
      if (moneda) {
        caja[moneda] = (caja[moneda] ?? 0) - pago.monto;
      }
    }

    await this.cache.set(CACHE_KEY_CAJA, caja, 5 * 60 * 1000); // 5 min
    return caja;
  }

}

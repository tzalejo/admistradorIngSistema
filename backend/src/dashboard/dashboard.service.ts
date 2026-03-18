import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prestamo } from '../prestamos/entities/prestamo.entity';
import { CuotaInteres } from '../prestamos/entities/cuota-interes.entity';
import { Operacion } from '../operaciones/entities/operacion.entity';
import { EstadoPrestamo } from '../common/enums/estado-prestamo.enum';
import { EstadoCuota } from '../common/enums/estado-cuota.enum';
import { MonedasService } from '../monedas/monedas.service';

export interface Movimiento {
  id: string;
  fecha: Date;
  descripcion: string;
  tipo: 'ingreso' | 'egreso' | 'compra' | 'venta' | 'pago_interes' | 'devolucion' | 'gasto' | 'ingreso_efectivo';
  moneda: string;
  debe: number | null;
  haber: number | null;
  referenciaTipo: 'prestamo' | 'cuota' | 'operacion';
  referenciaId: string;
  cliente?: string;
}

export interface ResumenDashboard {
  prestamosActivos: number;
  capitalTotalPorMoneda: Record<string, number>;
  interesesPendientesPorMoneda: Record<string, number>;
  interesesPagadosPorMoneda: Record<string, number>;
  operacionesTotales: number;
  proximasCuotas: Array<{
    cuotaId: string;
    prestamoId: string;
    cliente: string;
    mesNumero: number;
    montoPago: number;
    moneda: string;
    fechaVencimiento: Date;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Prestamo)
    private readonly prestamoRepo: Repository<Prestamo>,
    @InjectRepository(CuotaInteres)
    private readonly cuotaRepo: Repository<CuotaInteres>,
    @InjectRepository(Operacion)
    private readonly operacionRepo: Repository<Operacion>,
    private readonly monedasService: MonedasService,
  ) {}

  async getMovimientos(): Promise<Movimiento[]> {
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

    // 2. Pagos de intereses (cuotas pagadas)
    const cuotasPagadas = await this.cuotaRepo.find({
      where: { estado: EstadoCuota.PAGADO },
      relations: ['prestamo'],
      order: { fechaPagoReal: 'ASC' },
    });
    for (const c of cuotasPagadas) {
      movimientos.push({
        id: `cuota-${c.id}`,
        fecha: c.fechaPagoReal ?? c.fechaVencimiento,
        descripcion: `Pago interés mes ${c.mesNumero} - ${c.prestamo?.cliente ?? ''}`,
        tipo: 'pago_interes',
        moneda: c.prestamo?.moneda ?? 'ARS',
        debe: c.montoPago,
        haber: null,
        referenciaTipo: 'cuota',
        referenciaId: c.id,
        cliente: c.prestamo?.cliente,
      });
    }

    // 3. Operaciones de compra/venta/gasto
    const operaciones = await this.operacionRepo.find({ order: { fecha: 'ASC' } });
    for (const op of operaciones) {
      if (op.tipo === 'ingreso') {
        movimientos.push({
          id: `op-ingreso-${op.id}`,
          fecha: op.fecha,
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
    return movimientos;
  }

  async getResumen(): Promise<ResumenDashboard> {
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
        if (c.estado === EstadoCuota.PENDIENTE) {
          interesesPendientesPorMoneda[p.moneda] = (interesesPendientesPorMoneda[p.moneda] ?? 0) + c.montoPago;
        } else {
          interesesPagadosPorMoneda[p.moneda] = (interesesPagadosPorMoneda[p.moneda] ?? 0) + c.montoPago;
        }
      }
    }

    const operacionesTotales = await this.operacionRepo.count();

    const proximasCuotasRaw = await this.cuotaRepo.find({
      where: { estado: EstadoCuota.PENDIENTE },
      relations: ['prestamo'],
      order: { fechaVencimiento: 'ASC' },
      take: 10,
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

    return {
      prestamosActivos: prestamosActivos.length,
      capitalTotalPorMoneda,
      interesesPendientesPorMoneda,
      interesesPagadosPorMoneda,
      operacionesTotales,
      proximasCuotas,
    };
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
    const [prestamos, operaciones, cuotasPagadas, codigos] = await Promise.all([
      this.prestamoRepo.find(),
      this.operacionRepo.find(),
      this.cuotaRepo.find({
        where: { estado: EstadoCuota.PAGADO },
        relations: ['prestamo'],
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

    for (const c of cuotasPagadas) {
      if (c.prestamo) {
        caja[c.prestamo.moneda] = (caja[c.prestamo.moneda] ?? 0) - c.montoPago;
      }
    }

    return caja;
  }

}

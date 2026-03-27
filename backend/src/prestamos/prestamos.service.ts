import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource, Repository } from 'typeorm';
import { addMonths, parseISO } from 'date-fns';
import { Prestamo } from './entities/prestamo.entity';
import { CuotaInteres } from './entities/cuota-interes.entity';
import { PagoCuota } from './entities/pago-cuota.entity';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';
import { UpdateCuotaDto } from './dto/update-cuota.dto';
import { PagarCuotaDto } from './dto/pagar-cuota.dto';
import { UpdatePagoCuotaDto } from './dto/update-pago-cuota.dto';
import { EstadoPrestamo } from '../common/enums/estado-prestamo.enum';
import { EstadoCuota } from '../common/enums/estado-cuota.enum';
import { TasaTipo } from '../common/enums/tasa-tipo.enum';

const CACHE_KEY_MOVIMIENTOS = 'dashboard:movimientos';
const CACHE_KEY_CAJA = 'dashboard:caja';
const CACHE_KEY_RESUMEN = 'dashboard:resumen';

@Injectable()
export class PrestamosService {
  private readonly logger = new Logger(PrestamosService.name);

  constructor(
    @InjectRepository(Prestamo)
    private readonly prestamoRepo: Repository<Prestamo>,
    @InjectRepository(CuotaInteres)
    private readonly cuotaRepo: Repository<CuotaInteres>,
    @InjectRepository(PagoCuota)
    private readonly pagoRepo: Repository<PagoCuota>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async create(dto: CreatePrestamoDto): Promise<Prestamo> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();
      const horaDefault = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const prestamo = queryRunner.manager.create(Prestamo, {
        cliente: dto.cliente,
        montoInicial: dto.montoInicial,
        moneda: dto.moneda,
        fechaInicio: parseISO(dto.fechaInicio),
        hora: dto.hora ?? horaDefault,
        plazoMeses: dto.plazoMeses,
        tasaTipo: dto.tasaTipo,
        tasaInicial: dto.tasaInicial,
        notas: dto.notas ?? null,
      });

      const saved = await queryRunner.manager.save(Prestamo, prestamo);
      const cuotas = this.generarCuotas(saved, dto);
      await queryRunner.manager.save(CuotaInteres, cuotas);
      await queryRunner.commitTransaction();

      this.logger.log(`Préstamo creado: id=${saved.id}, cliente=${saved.cliente}, monto=${saved.montoInicial} ${saved.moneda}`);
      await this.cache.del(CACHE_KEY_MOVIMIENTOS);
      await this.cache.del(CACHE_KEY_CAJA);
      await this.cache.del(CACHE_KEY_RESUMEN);
      return this.findOne(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error al crear préstamo', error instanceof Error ? error.stack : String(error));
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private generarCuotas(prestamo: Prestamo, dto: CreatePrestamoDto): Partial<CuotaInteres>[] {
    const cuotas: Partial<CuotaInteres>[] = [];
    const fechaBase = parseISO(dto.fechaInicio);

    for (let mes = 1; mes <= dto.plazoMeses; mes++) {
      const fechaVencimiento = addMonths(fechaBase, mes);
      let montoPago: number;

      if (dto.tasaTipo === TasaTipo.PORCENTAJE) {
        montoPago = (dto.montoInicial * dto.tasaInicial) / 100;
      } else {
        montoPago = dto.tasaInicial;
      }

      cuotas.push({
        prestamo,
        prestamoId: prestamo.id,
        mesNumero: mes,
        tasaAplicada: dto.tasaInicial,
        montoPago,
        fechaVencimiento,
        estado: EstadoCuota.PENDIENTE,
      });
    }

    return cuotas;
  }

  async findAll(): Promise<Prestamo[]> {
    return this.prestamoRepo.find({
      relations: ['cuotas'],
      order: { fechaInicio: 'DESC', hora: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Prestamo> {
    const prestamo = await this.prestamoRepo.findOne({
      where: { id },
      relations: ['cuotas'],
      order: { cuotas: { mesNumero: 'ASC' } } as any,
    });
    if (!prestamo) throw new NotFoundException(`Préstamo ${id} no encontrado`);
    return prestamo;
  }

  async update(id: number, dto: UpdatePrestamoDto): Promise<Prestamo> {
    const prestamo = await this.findOne(id);

    if (dto.estado === EstadoPrestamo.DEVUELTO && !dto.fechaDevolucion) {
      throw new BadRequestException('Debe indicar fechaDevolucion al marcar como devuelto');
    }

    Object.assign(prestamo, {
      ...(dto.cliente !== undefined && { cliente: dto.cliente }),
      ...(dto.moneda !== undefined && { moneda: dto.moneda }),
      ...(dto.notas !== undefined && { notas: dto.notas }),
      ...(dto.estado !== undefined && { estado: dto.estado }),
      ...(dto.fechaDevolucion !== undefined && {
        fechaDevolucion: parseISO(dto.fechaDevolucion),
      }),
    });

    await this.prestamoRepo.save(prestamo);
    await this.cache.del(CACHE_KEY_MOVIMIENTOS);
    await this.cache.del(CACHE_KEY_CAJA);
    await this.cache.del(CACHE_KEY_RESUMEN);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const prestamo = await this.findOne(id);
    await this.prestamoRepo.remove(prestamo);
    await this.cache.del(CACHE_KEY_MOVIMIENTOS);
    await this.cache.del(CACHE_KEY_CAJA);
    await this.cache.del(CACHE_KEY_RESUMEN);
  }

  // --- Cuotas ---

  async findCuotas(prestamoId: number): Promise<CuotaInteres[]> {
    await this.findOne(prestamoId); // valida que exista
    return this.cuotaRepo.find({
      where: { prestamoId },
      order: { mesNumero: 'ASC' },
    });
  }

  async updateCuota(id: number, dto: UpdateCuotaDto): Promise<CuotaInteres> {
    const cuota = await this.cuotaRepo.findOne({ where: { id } });
    if (!cuota) throw new NotFoundException(`Cuota ${id} no encontrada`);

    // Si se cambia el estado a pendiente, limpiar pagos, montoPagado y fechaPagoReal
    if (dto.estado === EstadoCuota.PENDIENTE && cuota.estado !== EstadoCuota.PENDIENTE) {
      await this.pagoRepo.delete({ cuotaId: id });
      cuota.montoPagado = 0;
      cuota.fechaPagoReal = null;
    }

    Object.assign(cuota, {
      ...(dto.tasaAplicada !== undefined && { tasaAplicada: dto.tasaAplicada }),
      ...(dto.montoPago !== undefined && { montoPago: dto.montoPago }),
      ...(dto.fechaVencimiento !== undefined && {
        fechaVencimiento: parseISO(dto.fechaVencimiento),
      }),
      ...(dto.fechaPagoReal !== undefined && {
        fechaPagoReal: dto.fechaPagoReal ? parseISO(dto.fechaPagoReal) : null,
      }),
      ...(dto.estado !== undefined && { estado: dto.estado }),
      ...(dto.notas !== undefined && { notas: dto.notas }),
    });

    const saved = await this.cuotaRepo.save(cuota);
    await this.invalidarCache();
    return saved;
  }

  // --- Pagos de cuotas ---

  /**
   * Paga una cuota con soporte para pagos parciales y carry-over automático.
   * Crea un registro PagoCuota por cada cuota afectada.
   */
  async pagarCuota(id: number, dto: PagarCuotaDto): Promise<{ pagos: PagoCuota[] }> {
    const cuota = await this.cuotaRepo.findOne({ where: { id } });
    if (!cuota) throw new NotFoundException(`Cuota ${id} no encontrada`);
    if (cuota.estado === EstadoCuota.PAGADO) {
      throw new BadRequestException(`La cuota ${id} ya está pagada`);
    }

    const saldoPendiente = cuota.montoPago - cuota.montoPagado;
    if (saldoPendiente <= 0) {
      throw new BadRequestException(`La cuota ${id} ya está completamente pagada`);
    }

    let montoRestante = dto.monto;
    const fechaPago = parseISO(dto.fechaPago);
    const pagosCreados: PagoCuota[] = [];

    // Aplicar pago a la cuota actual
    const aplicado = Math.min(montoRestante, saldoPendiente);
    const pago = this.pagoRepo.create({
      cuotaId: cuota.id,
      monto: aplicado,
      fechaPago,
    });
    pagosCreados.push(await this.pagoRepo.save(pago));
    montoRestante -= aplicado;

    await this.recalcularCuota(cuota.id);

    // Carry-over: si sobra monto, aplicar a siguientes cuotas
    if (montoRestante > 0) {
      const candidatas = await this.cuotaRepo.find({
        where: [
          { prestamoId: cuota.prestamoId, estado: EstadoCuota.PENDIENTE },
          { prestamoId: cuota.prestamoId, estado: EstadoCuota.PARCIAL },
        ],
        order: { mesNumero: 'ASC' },
      });

      for (const siguiente of candidatas) {
        if (montoRestante <= 0) break;
        if (siguiente.id === cuota.id) continue;

        const saldoSiguiente = siguiente.montoPago - siguiente.montoPagado;
        if (saldoSiguiente <= 0) continue;

        const aplicadoSig = Math.min(montoRestante, saldoSiguiente);
        const pagoSig = this.pagoRepo.create({
          cuotaId: siguiente.id,
          monto: aplicadoSig,
          fechaPago,
        });
        pagosCreados.push(await this.pagoRepo.save(pagoSig));
        montoRestante -= aplicadoSig;

        await this.recalcularCuota(siguiente.id);
      }
    }

    await this.invalidarCache();
    return { pagos: pagosCreados };
  }

  async findPagosByCuota(cuotaId: number): Promise<PagoCuota[]> {
    return this.pagoRepo.find({
      where: { cuotaId },
      order: { fechaPago: 'ASC', createdAt: 'ASC' },
    });
  }

  async updatePago(pagoId: number, dto: UpdatePagoCuotaDto): Promise<PagoCuota> {
    const pago = await this.pagoRepo.findOne({ where: { id: pagoId } });
    if (!pago) throw new NotFoundException(`Pago ${pagoId} no encontrado`);

    Object.assign(pago, {
      ...(dto.monto !== undefined && { monto: dto.monto }),
      ...(dto.fechaPago !== undefined && { fechaPago: parseISO(dto.fechaPago) }),
      ...(dto.notas !== undefined && { notas: dto.notas }),
    });

    const saved = await this.pagoRepo.save(pago);
    await this.recalcularCuota(pago.cuotaId);
    await this.invalidarCache();
    return saved;
  }

  async deletePago(pagoId: number): Promise<void> {
    const pago = await this.pagoRepo.findOne({ where: { id: pagoId } });
    if (!pago) throw new NotFoundException(`Pago ${pagoId} no encontrado`);

    const cuotaId = pago.cuotaId;
    await this.pagoRepo.remove(pago);
    await this.recalcularCuota(cuotaId);
    await this.invalidarCache();
  }

  /**
   * Recalcula montoPagado, fechaPagoReal y estado de una cuota
   * a partir de la suma de sus registros PagoCuota.
   */
  private async recalcularCuota(cuotaId: number): Promise<void> {
    const cuota = await this.cuotaRepo.findOne({ where: { id: cuotaId } });
    if (!cuota) return;

    const pagos = await this.pagoRepo.find({
      where: { cuotaId },
      order: { fechaPago: 'DESC' },
    });

    const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
    cuota.montoPagado = totalPagado;

    if (totalPagado <= 0) {
      cuota.estado = EstadoCuota.PENDIENTE;
      cuota.fechaPagoReal = null;
    } else if (totalPagado >= cuota.montoPago) {
      cuota.estado = EstadoCuota.PAGADO;
      cuota.fechaPagoReal = pagos[0]?.fechaPago ?? null; // última fecha de pago
    } else {
      cuota.estado = EstadoCuota.PARCIAL;
      cuota.fechaPagoReal = pagos[0]?.fechaPago ?? null;
    }

    await this.cuotaRepo.save(cuota);
  }

  private async invalidarCache(): Promise<void> {
    await this.cache.del(CACHE_KEY_MOVIMIENTOS);
    await this.cache.del(CACHE_KEY_CAJA);
    await this.cache.del(CACHE_KEY_RESUMEN);
  }

  // Resumen financiero de un préstamo específico
  async getResumenPrestamo(id: number) {
    const prestamo = await this.findOne(id);
    const cuotas = prestamo.cuotas ?? [];

    const totalInteresGenerado = cuotas.reduce((sum, c) => sum + c.montoPago, 0);
    const totalInteresPagado = cuotas.reduce((sum, c) => sum + c.montoPagado, 0);
    const totalInteresPendiente = totalInteresGenerado - totalInteresPagado;
    const cuotasPagadas = cuotas.filter((c) => c.estado === EstadoCuota.PAGADO).length;
    const cuotasPendientes = cuotas.filter(
      (c) => c.estado === EstadoCuota.PENDIENTE || c.estado === EstadoCuota.PARCIAL,
    ).length;

    const proximaCuota = cuotas
      .filter((c) => c.estado === EstadoCuota.PENDIENTE || c.estado === EstadoCuota.PARCIAL)
      .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime())[0] ?? null;

    return {
      prestamo,
      totalInteresGenerado,
      totalInteresPagado,
      totalInteresPendiente,
      cuotasPagadas,
      cuotasPendientes,
      proximaCuota,
    };
  }
}

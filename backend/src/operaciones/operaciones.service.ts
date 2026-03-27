import { BadRequestException, Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource, Repository } from 'typeorm';
import { parseISO } from 'date-fns';
import { Operacion } from './entities/operacion.entity';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionDto } from './dto/update-operacion.dto';
import { TipoOperacion } from '../common/enums/tipo-operacion.enum';
import { EstadoPrestamo } from '../common/enums/estado-prestamo.enum';


const CACHE_KEY_MOVIMIENTOS = 'dashboard:movimientos';
const CACHE_KEY_CAJA = 'dashboard:caja';
const CACHE_KEY_RESUMEN = 'dashboard:resumen';

@Injectable()
export class OperacionesService {
  private readonly logger = new Logger(OperacionesService.name);

  constructor(
    @InjectRepository(Operacion)
    private readonly operacionRepo: Repository<Operacion>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private async calcularSaldo(moneda: string): Promise<number> {
    // Capital neto de préstamos (activos suman, devueltos no)
    const prestamosRow = await this.dataSource
      .createQueryBuilder()
      .select(
        `COALESCE(SUM(CASE WHEN estado != '${EstadoPrestamo.DEVUELTO}' THEN monto_inicial ELSE 0 END), 0)`,
        'capitalNeto',
      )
      .from('prestamos', 'p')
      .where('p.moneda = :moneda', { moneda })
      .getRawOne<{ capitalNeto: string }>();

    // Saldo de operaciones: ingresos suman, el resto resta/suma según moneda origen/destino
    const opRow = await this.dataSource
      .createQueryBuilder()
      .select(
        `COALESCE(SUM(CASE WHEN tipo = '${TipoOperacion.INGRESO}' AND moneda_origen = :moneda THEN monto_origen ELSE 0 END), 0)`,
        'entradas',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN tipo != '${TipoOperacion.INGRESO}' AND moneda_origen = :moneda THEN monto_origen ELSE 0 END), 0)`,
        'salidasOrigen',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN tipo != '${TipoOperacion.INGRESO}' AND moneda_destino = :moneda THEN monto_destino ELSE 0 END), 0)`,
        'entradasDestino',
      )
      .from('operaciones', 'op')
      .setParameter('moneda', moneda)
      .getRawOne<{ entradas: string; salidasOrigen: string; entradasDestino: string }>();

    // Intereses ya cobrados (salen de caja) — suma de pagos individuales
    const cuotasRow = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(pc.monto), 0)', 'interesesPagados')
      .from('pagos_cuota', 'pc')
      .innerJoin('cuotas_interes', 'ci', 'ci.id = pc.cuota_id')
      .innerJoin('prestamos', 'p', 'p.id = ci.prestamo_id')
      .where('p.moneda = :moneda', { moneda })
      .getRawOne<{ interesesPagados: string }>();

    return (
      Number(prestamosRow?.capitalNeto ?? 0) +
      Number(opRow?.entradas ?? 0) -
      Number(opRow?.salidasOrigen ?? 0) +
      Number(opRow?.entradasDestino ?? 0) -
      Number(cuotasRow?.interesesPagados ?? 0)
    );
  }

  async create(dto: CreateOperacionDto): Promise<Operacion> {
    if (dto.tipo === TipoOperacion.GASTO) {
      const saldo = await this.calcularSaldo(dto.monedaOrigen);
      if (dto.montoOrigen > saldo) {
        throw new BadRequestException(
          `Saldo insuficiente en ${dto.monedaOrigen}. Disponible: ${saldo.toFixed(2)}, requerido: ${dto.montoOrigen}`,
        );
      }
    }

    const operacion = this.operacionRepo.create({
      tipo: dto.tipo,
      monedaOrigen: dto.monedaOrigen,
      monedaDestino: dto.monedaDestino ?? null,
      montoOrigen: dto.montoOrigen,
      tasaCambio: dto.tasaCambio ?? null,
      montoDestino: dto.montoDestino ?? null,
      fecha: parseISO(dto.fecha),
      hora: dto.hora,
      notas: dto.notas ?? null,
    });

    const saved = await this.operacionRepo.save(operacion);
    this.logger.log(`Operación creada: id=${saved.id}, tipo=${saved.tipo}, ${saved.montoOrigen} ${saved.monedaOrigen}`);
    await this.cache.del(CACHE_KEY_MOVIMIENTOS);
    await this.cache.del(CACHE_KEY_CAJA);
    await this.cache.del(CACHE_KEY_RESUMEN);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<Operacion[]> {
    return this.operacionRepo.find({
      order: { fecha: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Operacion> {
    const op = await this.operacionRepo.findOne({ where: { id } });
    if (!op) throw new NotFoundException(`Operación ${id} no encontrada`);
    return op;
  }

  async update(id: number, dto: UpdateOperacionDto): Promise<Operacion> {
    const op = await this.findOne(id);

    Object.assign(op, {
      ...(dto.tipo !== undefined && { tipo: dto.tipo }),
      ...(dto.monedaOrigen !== undefined && { monedaOrigen: dto.monedaOrigen }),
      ...(dto.monedaDestino !== undefined && { monedaDestino: dto.monedaDestino }),
      ...(dto.montoOrigen !== undefined && { montoOrigen: dto.montoOrigen }),
      ...(dto.tasaCambio !== undefined && { tasaCambio: dto.tasaCambio }),
      ...(dto.montoDestino !== undefined && { montoDestino: dto.montoDestino }),
      ...(dto.fecha !== undefined && { fecha: parseISO(dto.fecha) }),
      ...(dto.hora !== undefined && { hora: dto.hora }),
      ...(dto.notas !== undefined && { notas: dto.notas }),
    });

    await this.operacionRepo.save(op);
    await this.cache.del(CACHE_KEY_MOVIMIENTOS);
    await this.cache.del(CACHE_KEY_CAJA);
    await this.cache.del(CACHE_KEY_RESUMEN);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const op = await this.findOne(id);
    await this.operacionRepo.remove(op);
    await this.cache.del(CACHE_KEY_MOVIMIENTOS);
    await this.cache.del(CACHE_KEY_CAJA);
    await this.cache.del(CACHE_KEY_RESUMEN);
    this.logger.log(`Operación eliminada: id=${id}`);
  }
}

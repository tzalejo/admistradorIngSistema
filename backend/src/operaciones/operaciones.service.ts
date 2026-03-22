import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseISO } from 'date-fns';
import { Operacion } from './entities/operacion.entity';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionDto } from './dto/update-operacion.dto';
import { Prestamo } from '../prestamos/entities/prestamo.entity';
import { CuotaInteres } from '../prestamos/entities/cuota-interes.entity';
import { TipoOperacion } from '../common/enums/tipo-operacion.enum';
import { EstadoPrestamo } from '../common/enums/estado-prestamo.enum';
import { EstadoCuota } from '../common/enums/estado-cuota.enum';

@Injectable()
export class OperacionesService {
  constructor(
    @InjectRepository(Operacion)
    private readonly operacionRepo: Repository<Operacion>,
    @InjectRepository(Prestamo)
    private readonly prestamoRepo: Repository<Prestamo>,
    @InjectRepository(CuotaInteres)
    private readonly cuotaRepo: Repository<CuotaInteres>,
  ) {}

  private async calcularSaldo(moneda: string): Promise<number> {
    const [prestamos, operaciones, cuotasPagadas] = await Promise.all([
      this.prestamoRepo.find(),
      this.operacionRepo.find(),
      this.cuotaRepo.find({ where: { estado: EstadoCuota.PAGADO }, relations: ['prestamo'] }),
    ]);

    let saldo = 0;

    for (const p of prestamos) {
      if (p.moneda !== moneda) continue;
      saldo += Number(p.montoInicial);
      if (p.estado === EstadoPrestamo.DEVUELTO) saldo -= Number(p.montoInicial);
    }

    for (const op of operaciones) {
      if (op.tipo === TipoOperacion.INGRESO && op.monedaOrigen === moneda) {
        saldo += Number(op.montoOrigen);
      } else if (op.tipo !== TipoOperacion.INGRESO) {
        if (op.monedaOrigen === moneda) saldo -= Number(op.montoOrigen);
        if (op.monedaDestino === moneda && op.montoDestino !== null) saldo += Number(op.montoDestino);
      }
    }

    for (const c of cuotasPagadas) {
      if (c.prestamo?.moneda === moneda) saldo -= Number(c.montoPago);
    }

    return saldo;
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
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const op = await this.findOne(id);
    await this.operacionRepo.remove(op);
  }
}

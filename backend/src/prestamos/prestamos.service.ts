import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addMonths, parseISO } from 'date-fns';
import { Prestamo } from './entities/prestamo.entity';
import { CuotaInteres } from './entities/cuota-interes.entity';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';
import { UpdateCuotaDto } from './dto/update-cuota.dto';
import { EstadoPrestamo } from '../common/enums/estado-prestamo.enum';
import { EstadoCuota } from '../common/enums/estado-cuota.enum';
import { TasaTipo } from '../common/enums/tasa-tipo.enum';

@Injectable()
export class PrestamosService {
  constructor(
    @InjectRepository(Prestamo)
    private readonly prestamoRepo: Repository<Prestamo>,
    @InjectRepository(CuotaInteres)
    private readonly cuotaRepo: Repository<CuotaInteres>,
  ) {}

  async create(dto: CreatePrestamoDto): Promise<Prestamo> {
    const prestamo = this.prestamoRepo.create({
      cliente: dto.cliente,
      montoInicial: dto.montoInicial,
      moneda: dto.moneda,
      fechaInicio: parseISO(dto.fechaInicio),
      plazoMeses: dto.plazoMeses,
      tasaTipo: dto.tasaTipo,
      tasaInicial: dto.tasaInicial,
      notas: dto.notas ?? null,
    });

    const saved = await this.prestamoRepo.save(prestamo);

    // Generar cuotas automáticamente
    const cuotas = this.generarCuotas(saved, dto);
    await this.cuotaRepo.save(cuotas);

    return this.findOne(saved.id);
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
      order: { createdAt: 'DESC' },
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
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const prestamo = await this.findOne(id);
    await this.prestamoRepo.remove(prestamo);
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

    Object.assign(cuota, {
      ...(dto.tasaAplicada !== undefined && { tasaAplicada: dto.tasaAplicada }),
      ...(dto.montoPago !== undefined && { montoPago: dto.montoPago }),
      ...(dto.fechaVencimiento !== undefined && {
        fechaVencimiento: parseISO(dto.fechaVencimiento),
      }),
      ...(dto.fechaPagoReal !== undefined && {
        fechaPagoReal: parseISO(dto.fechaPagoReal),
      }),
      ...(dto.estado !== undefined && { estado: dto.estado }),
      ...(dto.notas !== undefined && { notas: dto.notas }),
    });

    return this.cuotaRepo.save(cuota);
  }

  // Resumen financiero de un préstamo específico
  async getResumenPrestamo(id: number) {
    const prestamo = await this.findOne(id);
    const cuotas = prestamo.cuotas ?? [];

    const totalInteresGenerado = cuotas.reduce((sum, c) => sum + c.montoPago, 0);
    const totalInteresPagado = cuotas
      .filter((c) => c.estado === EstadoCuota.PAGADO)
      .reduce((sum, c) => sum + c.montoPago, 0);
    const totalInteresPendiente = cuotas
      .filter((c) => c.estado === EstadoCuota.PENDIENTE)
      .reduce((sum, c) => sum + c.montoPago, 0);
    const cuotasPagadas = cuotas.filter((c) => c.estado === EstadoCuota.PAGADO).length;
    const cuotasPendientes = cuotas.filter((c) => c.estado === EstadoCuota.PENDIENTE).length;

    const proximaCuota = cuotas
      .filter((c) => c.estado === EstadoCuota.PENDIENTE)
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

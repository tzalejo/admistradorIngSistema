import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseISO } from 'date-fns';
import { Operacion } from './entities/operacion.entity';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionDto } from './dto/update-operacion.dto';

@Injectable()
export class OperacionesService {
  constructor(
    @InjectRepository(Operacion)
    private readonly operacionRepo: Repository<Operacion>,
  ) {}

  async create(dto: CreateOperacionDto): Promise<Operacion> {
    const operacion = this.operacionRepo.create({
      tipo: dto.tipo,
      monedaOrigen: dto.monedaOrigen,
      monedaDestino: dto.monedaDestino ?? null,
      montoOrigen: dto.montoOrigen,
      tasaCambio: dto.tasaCambio ?? null,
      montoDestino: dto.montoDestino ?? null,
      fecha: parseISO(dto.fecha),
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

  async findOne(id: string): Promise<Operacion> {
    const op = await this.operacionRepo.findOne({ where: { id } });
    if (!op) throw new NotFoundException(`Operación ${id} no encontrada`);
    return op;
  }

  async update(id: string, dto: UpdateOperacionDto): Promise<Operacion> {
    const op = await this.findOne(id);

    Object.assign(op, {
      ...(dto.tipo !== undefined && { tipo: dto.tipo }),
      ...(dto.monedaOrigen !== undefined && { monedaOrigen: dto.monedaOrigen }),
      ...(dto.monedaDestino !== undefined && { monedaDestino: dto.monedaDestino }),
      ...(dto.montoOrigen !== undefined && { montoOrigen: dto.montoOrigen }),
      ...(dto.tasaCambio !== undefined && { tasaCambio: dto.tasaCambio }),
      ...(dto.montoDestino !== undefined && { montoDestino: dto.montoDestino }),
      ...(dto.fecha !== undefined && { fecha: parseISO(dto.fecha) }),
      ...(dto.notas !== undefined && { notas: dto.notas }),
    });

    await this.operacionRepo.save(op);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const op = await this.findOne(id);
    await this.operacionRepo.remove(op);
  }
}

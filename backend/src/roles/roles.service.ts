import { Injectable, OnApplicationBootstrap, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from './entities/rol.entity';

const ROLES_INICIALES = [
  { nombre: 'admin', descripcion: 'Acceso total al sistema' },
  { nombre: 'operador', descripcion: 'Acceso estándar de operaciones' },
];

@Injectable()
export class RolesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Rol)
    private readonly repo: Repository<Rol>,
  ) {}

  async onApplicationBootstrap() {
    for (const rol of ROLES_INICIALES) {
      const exists = await this.repo.findOneBy({ nombre: rol.nombre });
      if (!exists) {
        await this.repo.save(this.repo.create(rol));
      }
    }
  }

  findAll(): Promise<Rol[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Rol> {
    const rol = await this.repo.findOneBy({ id });
    if (!rol) throw new NotFoundException(`Rol #${id} no encontrado`);
    return rol;
  }

  findByNombre(nombre: string): Promise<Rol | null> {
    return this.repo.findOneBy({ nombre });
  }

  async create(nombre: string, descripcion?: string): Promise<Rol> {
    return this.repo.save(this.repo.create({ nombre, descripcion: descripcion ?? null }));
  }

  async update(id: number, data: { nombre?: string; descripcion?: string }): Promise<Rol> {
    const rol = await this.findOne(id);
    Object.assign(rol, data);
    return this.repo.save(rol);
  }

  async remove(id: number): Promise<void> {
    const rol = await this.findOne(id);
    await this.repo.remove(rol);
  }
}

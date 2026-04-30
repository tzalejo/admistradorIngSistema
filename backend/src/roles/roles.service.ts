import { Injectable, OnApplicationBootstrap, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Rol } from './entities/rol.entity';

const ROLES_INICIALES = [
  { nombre: 'admin', descripcion: 'Acceso total al sistema' },
  { nombre: 'operador', descripcion: 'Acceso estándar de operaciones' },
  { nombre: 'inversor', descripcion: 'Cliente que aporta capital al negocio para obtener intereses' },
];

const CACHE_KEY_ROLES = 'roles:all';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class RolesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Rol)
    private readonly repo: Repository<Rol>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async onApplicationBootstrap() {
    for (const rol of ROLES_INICIALES) {
      const exists = await this.repo.findOneBy({ nombre: rol.nombre });
      if (!exists) {
        await this.repo.save(this.repo.create(rol));
      }
    }
    // Pre-calienta el cache al arrancar
    await this.findAll();
  }

  async findAll(): Promise<Rol[]> {
    const cached = await this.cache.get<Rol[]>(CACHE_KEY_ROLES);
    if (cached) return cached;
    const roles = await this.repo.find({ order: { id: 'ASC' } });
    await this.cache.set(CACHE_KEY_ROLES, roles, CACHE_TTL);
    return roles;
  }

  async findOne(id: number): Promise<Rol> {
    const rol = await this.repo.findOneBy({ id });
    if (!rol) throw new NotFoundException(`Rol #${id} no encontrado`);
    return rol;
  }

  async findByNombre(nombre: string): Promise<Rol | null> {
    const roles = await this.findAll();
    return roles.find((r) => r.nombre === nombre) ?? null;
  }

  async create(nombre: string, descripcion?: string): Promise<Rol> {
    const rol = await this.repo.save(this.repo.create({ nombre, descripcion: descripcion ?? null }));
    await this.cache.del(CACHE_KEY_ROLES);
    return rol;
  }

  async update(id: number, data: { nombre?: string; descripcion?: string }): Promise<Rol> {
    const rol = await this.findOne(id);
    Object.assign(rol, data);
    const saved = await this.repo.save(rol);
    await this.cache.del(CACHE_KEY_ROLES);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const rol = await this.findOne(id);
    await this.repo.remove(rol);
    await this.cache.del(CACHE_KEY_ROLES);
  }
}

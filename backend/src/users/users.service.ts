import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from '../roles/roles.service';

const CACHE_KEY_USER_EMAIL = (email: string) => `user:email:${email}`;
const CACHE_TTL = 60 * 1000; // 60 segundos

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly rolesService: RolesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) { }

  async onApplicationBootstrap() {
    const email = 'tzalejo@gmail.com';
    const exists = await this.usersRepository.findOneBy({ email });
    if (!exists) {
      const rolAdmin = await this.rolesService.findByNombre('admin');
      const hashedPassword = await bcrypt.hash('secret1234', 12);
      await this.usersRepository.save(
        this.usersRepository.create({
          email,
          password: hashedPassword,
          firstName: 'Alejandro',
          lastName: 'Valenzuela',
          idRol: rolAdmin?.id ?? null,
        }),
      );
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    // Asignar rol operador por defecto
    const rolOperador = await this.rolesService.findByNombre('operador');

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      idRol: rolOperador?.id ?? null,
    });

    const saved = await this.usersRepository.save(user);
    await this.cache.del(CACHE_KEY_USER_EMAIL(saved.email));
    return saved;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'idRol', 'isActive', 'createdAt'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const cached = await this.cache.get<User>(CACHE_KEY_USER_EMAIL(email));
    if (cached) return cached;
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user) await this.cache.set(CACHE_KEY_USER_EMAIL(email), user, CACHE_TTL);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    Object.assign(user, updateUserDto);
    const saved = await this.usersRepository.save(user);
    await this.cache.del(CACHE_KEY_USER_EMAIL(saved.email));
    return saved;
  }

  async updateRefreshToken(id: number, refreshToken: string | null): Promise<void> {
    await this.usersRepository.update(id, { refreshToken });
    // No invalida cache — refreshToken no afecta la autenticación de findByEmail
  }

  async updateRol(id: number, idRol: number): Promise<User> {
    const user = await this.findOne(id);
    const rol = await this.rolesService.findOne(idRol);
    user.idRol = rol.id;
    const saved = await this.usersRepository.save(user);
    await this.cache.del(CACHE_KEY_USER_EMAIL(saved.email));
    return saved;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    await this.cache.del(CACHE_KEY_USER_EMAIL(user.email));
  }
}

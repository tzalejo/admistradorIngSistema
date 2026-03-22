import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoPrestamo } from '../../common/enums/estado-prestamo.enum';
import { TasaTipo } from '../../common/enums/tasa-tipo.enum';
import { Moneda } from '../../monedas/entities/moneda.entity';
import { CuotaInteres } from './cuota-interes.entity';

@Entity('prestamos')
export class Prestamo {
  @PrimaryGeneratedColumn()
  id: number;

  // Nombre del prestamista (quien nos da el dinero)
  @Column({ length: 255 })
  cliente: string;

  @Column({
    name: 'monto_inicial',
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  montoInicial: number;

  // Código de moneda como string (valor FK directo — mantiene la API igual)
  @Column({ name: 'moneda', type: 'varchar', length: 10 })
  moneda: string;

  // Relación con la tabla monedas (FK real: prestamos.moneda → monedas.codigo)
  @ManyToOne(() => Moneda, { eager: false, nullable: false })
  @JoinColumn({ name: 'moneda', referencedColumnName: 'codigo' })
  monedaObj: Moneda;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: Date;

  @Column({ name: 'plazo_meses', type: 'int' })
  plazoMeses: number;

  // Tipo de tasa: porcentaje mensual o monto fijo mensual
  @Column({ name: 'tasa_tipo', type: 'enum', enum: TasaTipo })
  tasaTipo: TasaTipo;

  // Tasa inicial (puede variar por mes en cuotas)
  @Column({
    name: 'tasa_inicial',
    type: 'decimal',
    precision: 10,
    scale: 4,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  tasaInicial: number;

  @Column({
    type: 'enum',
    enum: EstadoPrestamo,
    default: EstadoPrestamo.ACTIVO,
  })
  estado: EstadoPrestamo;

  // Fecha en que se devolvió el capital (si aplica)
  @Column({ name: 'fecha_devolucion', type: 'date', nullable: true })
  fechaDevolucion: Date | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @OneToMany(() => CuotaInteres, (cuota) => cuota.prestamo, { cascade: true })
  cuotas: CuotaInteres[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

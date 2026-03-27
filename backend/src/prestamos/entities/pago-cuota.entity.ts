import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CuotaInteres } from './cuota-interes.entity';

@Entity('pagos_cuota')
export class PagoCuota {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CuotaInteres, (cuota) => cuota.pagos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cuota_id' })
  cuota: CuotaInteres;

  @Column({ name: 'cuota_id', type: 'int' })
  cuotaId: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  monto: number;

  @Column({ name: 'fecha_pago', type: 'date' })
  fechaPago: Date;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Moneda } from '../../monedas/entities/moneda.entity';

const decimalTransformer = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v),
};

@Entity('cierre_caja')
@Unique(['fecha', 'idMoneda'])
export class CierreCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'id_moneda', type: 'int' })
  idMoneda: number;

  @ManyToOne(() => Moneda, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_moneda' })
  moneda: Moneda;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0, transformer: decimalTransformer })
  saldo: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0, transformer: decimalTransformer })
  entrada: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0, transformer: decimalTransformer })
  salida: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

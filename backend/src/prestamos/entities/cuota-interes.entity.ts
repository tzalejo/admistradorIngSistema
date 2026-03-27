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
import { EstadoCuota } from '../../common/enums/estado-cuota.enum';
import { Prestamo } from './prestamo.entity';
import { PagoCuota } from './pago-cuota.entity';

@Entity('cuotas_interes')
export class CuotaInteres {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prestamo, (prestamo) => prestamo.cuotas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'prestamo_id' })
  prestamo: Prestamo;

  @Column({ name: 'prestamo_id', type: 'int', nullable: true })
  prestamoId: number;

  // Número de mes dentro del préstamo (1, 2, 3...)
  @Column({ name: 'mes_numero', type: 'int' })
  mesNumero: number;

  // Tasa aplicada para este mes específico (puede cambiar mes a mes)
  @Column({
    name: 'tasa_aplicada',
    type: 'decimal',
    precision: 10,
    scale: 4,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  tasaAplicada: number;

  // Monto a pagar al prestamista este mes
  @Column({
    name: 'monto_pago',
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  montoPago: number;

  // Monto efectivamente pagado (permite pagos parciales y excedentes)
  @Column({
    name: 'monto_pagado',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  montoPagado: number;

  @Column({ name: 'fecha_vencimiento', type: 'date' })
  fechaVencimiento: Date;

  @Column({ name: 'fecha_pago_real', type: 'date', nullable: true })
  fechaPagoReal: Date | null;

  @Column({
    type: 'enum',
    enum: EstadoCuota,
    default: EstadoCuota.PENDIENTE,
  })
  estado: EstadoCuota;

  @OneToMany(() => PagoCuota, (pago) => pago.cuota, { cascade: true })
  pagos: PagoCuota[];

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

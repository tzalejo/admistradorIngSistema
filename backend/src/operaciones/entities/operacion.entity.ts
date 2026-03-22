import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TipoOperacion } from '../../common/enums/tipo-operacion.enum';

@Entity('operaciones')
@Index('idx_operaciones_fecha_hora', ['fecha', 'hora'])
export class Operacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipoOperacion })
  tipo: TipoOperacion;

  @Column({ name: 'moneda_origen', type: 'varchar', length: 10 })
  monedaOrigen: string;

  // Null para tipo 'gasto' (no hay intercambio de monedas)
  @Column({ name: 'moneda_destino', type: 'varchar', length: 10, nullable: true })
  monedaDestino: string | null;

  @Column({
    name: 'monto_origen',
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  montoOrigen: number;

  @Column({
    name: 'tasa_cambio',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v !== null ? parseFloat(v) : null),
    },
  })
  tasaCambio: number | null;

  @Column({
    name: 'monto_destino',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v !== null ? parseFloat(v) : null),
    },
  })
  montoDestino: number | null;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'time' })
  hora: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

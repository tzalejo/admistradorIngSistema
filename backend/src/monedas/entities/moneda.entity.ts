import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Prestamo } from '../../prestamos/entities/prestamo.entity';

@Entity('monedas')
export class Moneda {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @OneToMany(() => Prestamo, (prestamo) => prestamo.monedaObj)
  prestamos: Prestamo[];
}

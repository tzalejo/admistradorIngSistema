import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Prestamo } from '../../prestamos/entities/prestamo.entity';

@Entity('monedas')
@Unique(['codigo'])
export class Moneda {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @OneToMany(() => Prestamo, (prestamo) => prestamo.monedaObj)
  prestamos: Prestamo[];
}

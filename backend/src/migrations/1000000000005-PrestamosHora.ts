import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega columna hora (TIME) a prestamos e índice compuesto (fecha_inicio, hora).
 * Los préstamos existentes quedan con hora '00:00:00' como valor por defecto.
 */
export class PrestamosHora1000000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS hora TIME NOT NULL DEFAULT '00:00:00';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_prestamos_fecha_hora ON prestamos (fecha_inicio, hora);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_prestamos_fecha_hora;`);
    await queryRunner.query(`ALTER TABLE prestamos DROP COLUMN hora;`);
  }
}

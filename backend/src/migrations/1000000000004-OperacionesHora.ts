import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega columna hora (TIME) a operaciones e índice compuesto (fecha, hora).
 * Las operaciones existentes quedan con hora '00:00:00' como valor por defecto.
 */
export class OperacionesHora1000000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE operaciones ADD COLUMN IF NOT EXISTS hora TIME NOT NULL DEFAULT '00:00:00';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operaciones_fecha_hora ON operaciones (fecha, hora);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operaciones_fecha_hora;`);
    await queryRunner.query(`ALTER TABLE operaciones DROP COLUMN hora;`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina Bitcoin (BTC) de la tabla de monedas.
 * Solo operamos con ARS, USDT y USD.
 */
export class RemoveBTC1000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM monedas WHERE codigo = 'BTC';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO monedas (codigo, nombre, orden)
      VALUES ('BTC', 'Bitcoin', 4)
      ON CONFLICT (codigo) DO NOTHING;
    `);
  }
}

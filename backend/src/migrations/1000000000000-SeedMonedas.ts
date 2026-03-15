import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMonedas1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO monedas (codigo, nombre, orden)
      VALUES
        ('ARS',  'Peso Argentino',          1),
        ('USDT', 'Tether USD',              2),
        ('USD',  'Dólar Estadounidense',    3)
      ON CONFLICT (codigo) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM monedas WHERE codigo IN ('ARS', 'USDT', 'USD');
    `);
  }
}

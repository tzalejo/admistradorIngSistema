import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Limpia datos de prueba y prepara la FK prestamos.moneda → monedas.codigo.
 * Primero garantiza que la tabla monedas tenga los datos semilla,
 * luego borra los préstamos/cuotas/operaciones de prueba.
 */
export class CleanTestDataAndFKMoneda1000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Seed monedas (por si aún no existen)
    await queryRunner.query(`
      INSERT INTO monedas (codigo, nombre, orden)
      VALUES
        ('ARS',  'Peso Argentino',          1),
        ('USDT', 'Tether USD',              2),
        ('USD',  'Dólar Estadounidense',    3),
        ('BTC',  'Bitcoin',                 4)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // 2. Borrar datos de prueba (el CASCADE elimina cuotas automáticamente)
    await queryRunner.query(`DELETE FROM operaciones;`);
    await queryRunner.query(`DELETE FROM prestamos;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se puede recuperar datos borrados; este down es sólo informativo
  }
}

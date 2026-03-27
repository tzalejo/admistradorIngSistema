import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporte para pagos parciales de cuotas de interés:
 * - Agrega columna monto_pagado a cuotas_interes
 * - Agrega valor 'parcial' al enum estado de cuotas_interes
 * - Crea tabla pagos_cuota para registro individual de pagos
 * - Migra datos existentes: cuotas pagadas → un PagoCuota por cada una
 */
export class PagoParcialCuotas1000000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar columna monto_pagado
    await queryRunner.query(`
      ALTER TABLE cuotas_interes
      ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(18,8) NOT NULL DEFAULT 0;
    `);

    // 2. Agregar 'parcial' al enum de estado
    await queryRunner.query(`
      ALTER TYPE cuotas_interes_estado_enum ADD VALUE IF NOT EXISTS 'parcial' BEFORE 'pagado';
    `);

    // 3. Crear tabla pagos_cuota
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pagos_cuota (
        id SERIAL PRIMARY KEY,
        cuota_id INT NOT NULL REFERENCES cuotas_interes(id) ON DELETE CASCADE,
        monto DECIMAL(18,8) NOT NULL,
        fecha_pago DATE NOT NULL,
        notas TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagos_cuota_cuota_id ON pagos_cuota(cuota_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagos_cuota_fecha ON pagos_cuota(fecha_pago);
    `);

    // 4. Sincronizar datos existentes: cuotas pagadas → monto_pagado + PagoCuota
    await queryRunner.query(`
      UPDATE cuotas_interes SET monto_pagado = monto_pago WHERE estado = 'pagado';
    `);

    await queryRunner.query(`
      INSERT INTO pagos_cuota (cuota_id, monto, fecha_pago)
      SELECT id, monto_pago, COALESCE(fecha_pago_real, fecha_vencimiento)
      FROM cuotas_interes
      WHERE estado = 'pagado';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pagos_cuota;`);

    await queryRunner.query(`
      ALTER TABLE cuotas_interes DROP COLUMN IF EXISTS monto_pagado;
    `);

    await queryRunner.query(`
      UPDATE cuotas_interes SET estado = 'pendiente' WHERE estado = 'parcial';
    `);
  }
}

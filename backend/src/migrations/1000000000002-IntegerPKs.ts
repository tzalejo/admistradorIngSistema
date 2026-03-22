import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Convierte todos los IDs de UUID a INTEGER auto-incremental (SERIAL).
 * Tablas afectadas: users, prestamos, cuotas_interes, operaciones.
 * La tabla monedas usa VARCHAR como PK (códigos ARS/USDT/USD) y no cambia.
 *
 * IMPORTANTE: Esta migración trunca todos los datos de las tablas afectadas.
 */
export class IntegerPKs1000000000002 implements MigrationInterface {
  /** Elimina dinámicamente todos los constraints de un tipo en una tabla */
  private async dropConstraints(
    queryRunner: QueryRunner,
    table: string,
    type: 'PRIMARY KEY' | 'FOREIGN KEY',
  ): Promise<void> {
    await queryRunner.query(`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name   = '${table}'
            AND constraint_type = '${type}'
        ) LOOP
          EXECUTE 'ALTER TABLE ${table} DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Vaciar datos (CASCADE elimina cuotas_interes vía FK)
    await queryRunner.query(`
      TRUNCATE TABLE cuotas_interes, operaciones, prestamos, users
      RESTART IDENTITY CASCADE;
    `);

    // 2. Eliminar FKs antes de tocar PKs referenciados
    await this.dropConstraints(queryRunner, 'cuotas_interes', 'FOREIGN KEY');
    await this.dropConstraints(queryRunner, 'prestamos', 'FOREIGN KEY');

    // 3. users: uuid → serial
    await this.dropConstraints(queryRunner, 'users', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE users DROP COLUMN id;`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN id SERIAL PRIMARY KEY;`);

    // 4. prestamos: uuid → serial
    await this.dropConstraints(queryRunner, 'prestamos', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE prestamos DROP COLUMN id;`);
    await queryRunner.query(`ALTER TABLE prestamos ADD COLUMN id SERIAL PRIMARY KEY;`);

    // 5. cuotas_interes: id uuid → serial, prestamo_id varchar → integer
    await this.dropConstraints(queryRunner, 'cuotas_interes', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE cuotas_interes DROP COLUMN id;`);
    await queryRunner.query(`ALTER TABLE cuotas_interes ADD COLUMN id SERIAL PRIMARY KEY;`);
    await queryRunner.query(`ALTER TABLE cuotas_interes DROP COLUMN prestamo_id;`);
    await queryRunner.query(`ALTER TABLE cuotas_interes ADD COLUMN prestamo_id INTEGER;`);

    // 6. operaciones: uuid → serial
    await this.dropConstraints(queryRunner, 'operaciones', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE operaciones DROP COLUMN id;`);
    await queryRunner.query(`ALTER TABLE operaciones ADD COLUMN id SERIAL PRIMARY KEY;`);

    // 7. Recrear FK cuotas_interes.prestamo_id → prestamos.id
    await queryRunner.query(`
      ALTER TABLE cuotas_interes
        ADD CONSTRAINT fk_cuotas_prestamo
        FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir: integer → uuid (los datos se pierden de todas formas)
    await queryRunner.query(`
      TRUNCATE TABLE cuotas_interes, operaciones, prestamos, users CASCADE;
    `);

    await this.dropConstraints(queryRunner, 'cuotas_interes', 'FOREIGN KEY');

    // users
    await this.dropConstraints(queryRunner, 'users', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE users DROP COLUMN id;`);
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    `);

    // prestamos
    await this.dropConstraints(queryRunner, 'prestamos', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE prestamos DROP COLUMN id;`);
    await queryRunner.query(`
      ALTER TABLE prestamos ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    `);

    // cuotas_interes
    await this.dropConstraints(queryRunner, 'cuotas_interes', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE cuotas_interes DROP COLUMN id;`);
    await queryRunner.query(`
      ALTER TABLE cuotas_interes ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    `);
    await queryRunner.query(`ALTER TABLE cuotas_interes DROP COLUMN prestamo_id;`);
    await queryRunner.query(`ALTER TABLE cuotas_interes ADD COLUMN prestamo_id VARCHAR;`);

    // operaciones
    await this.dropConstraints(queryRunner, 'operaciones', 'PRIMARY KEY');
    await queryRunner.query(`ALTER TABLE operaciones DROP COLUMN id;`);
    await queryRunner.query(`
      ALTER TABLE operaciones ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    `);
  }
}

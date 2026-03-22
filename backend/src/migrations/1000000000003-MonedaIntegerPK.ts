import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega id SERIAL como PK a monedas y elimina la columna orden.
 * codigo pasa a tener constraint UNIQUE (sigue siendo referenciado por prestamos.moneda).
 */
export class MonedaIntegerPK1000000000003 implements MigrationInterface {
  private async dropConstraints(
    queryRunner: QueryRunner,
    table: string,
    type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE',
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
    // 1. Eliminar FK de prestamos que apunta a monedas.codigo (PK actual)
    await this.dropConstraints(queryRunner, 'prestamos', 'FOREIGN KEY');

    // 2. Eliminar PK de monedas (codigo)
    await this.dropConstraints(queryRunner, 'monedas', 'PRIMARY KEY');

    // 3. Agregar id SERIAL como nueva PK
    await queryRunner.query(`
      ALTER TABLE monedas ADD COLUMN id SERIAL PRIMARY KEY;
    `);

    // 4. Agregar UNIQUE en codigo (necesario para que la FK de prestamos siga funcionando)
    await queryRunner.query(`
      ALTER TABLE monedas ADD CONSTRAINT uq_monedas_codigo UNIQUE (codigo);
    `);

    // 5. Eliminar columna orden
    await queryRunner.query(`ALTER TABLE monedas DROP COLUMN orden;`);

    // 6. Recrear FK prestamos.moneda → monedas.codigo
    await queryRunner.query(`
      ALTER TABLE prestamos
        ADD CONSTRAINT fk_prestamos_moneda
        FOREIGN KEY (moneda) REFERENCES monedas(codigo);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropConstraints(queryRunner, 'prestamos', 'FOREIGN KEY');
    await queryRunner.query(`
      ALTER TABLE monedas DROP CONSTRAINT IF EXISTS uq_monedas_codigo;
    `);
    await this.dropConstraints(queryRunner, 'monedas', 'PRIMARY KEY');

    // Restaurar orden
    await queryRunner.query(`ALTER TABLE monedas ADD COLUMN orden INTEGER NOT NULL DEFAULT 0;`);

    // Quitar id y restaurar codigo como PK
    await queryRunner.query(`ALTER TABLE monedas DROP COLUMN id;`);
    await queryRunner.query(`ALTER TABLE monedas ADD CONSTRAINT monedas_pkey PRIMARY KEY (codigo);`);

    // Recrear FK
    await queryRunner.query(`
      ALTER TABLE prestamos
        ADD CONSTRAINT fk_prestamos_moneda
        FOREIGN KEY (moneda) REFERENCES monedas(codigo);
    `);
  }
}

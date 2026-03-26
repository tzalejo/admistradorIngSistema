#!/usr/bin/env bash
# Vacía todas las tablas de datos (preserva monedas y migrations).
# Uso: ./scripts/db-truncate.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Cargar variables de entorno desde .env
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

DB_USER="${DB_USER:-prestamos_user}"
DB_NAME="${DB_NAME:-prestamos_db}"

echo "Vaciando tablas en '$DB_NAME'..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" exec -T \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres \
  psql -U "$DB_USER" -d "$DB_NAME" -c \
  "TRUNCATE cuotas_interes, operaciones,monedas, prestamos RESTART IDENTITY CASCADE;"

echo "Listo. Las tablas fueron vaciadas (monedas y migrations no se tocaron)."

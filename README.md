# Préstamos App

Plataforma de gestión de préstamos de criptomonedas y monedas fiat.

## Tech Stack

- **Backend:** NestJS + TypeORM + PostgreSQL
- **Frontend:** React + Vite + TypeScript
- **Base de datos:** PostgreSQL 16
- **Infraestructura:** Docker + Docker Compose

## Requisitos

- Docker >= 24.0
- Docker Compose >= 2.20

## Inicio rápido

```bash
# Clonar el repositorio
git clone <repo-url>
cd prestamos-app

# Copiar variables de entorno
cp .env.example .env

# Levantar los servicios
docker compose up --build
```

## Servicios

| Servicio  | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:5173        |
| Backend   | http://localhost:3000        |
| Swagger   | http://localhost:3000/api/docs |
| PostgreSQL| localhost:5432               |

## Comandos útiles

```bash
# Levantar en segundo plano
docker compose up -d

# Ver logs
docker compose logs -f backend

# Reiniciar un servicio
docker compose restart backend

# Detener todo
docker compose down

# Detener y eliminar volúmenes (borra la DB)
docker compose down -v
```

## Migraciones de base de datos

Las migraciones viven en `backend/src/migrations/`. TypeORM registra cuáles ya se ejecutaron en la tabla `migrations`.

> **Nota:** los comandos deben correrse desde la carpeta `backend/`.
> Si la DB corre en Docker (host `postgres`), sobreescribí el host con `DB_HOST=localhost`.

```bash
cd backend

# Ejecutar todas las migraciones pendientes
DB_HOST=localhost npm run migration:run

# Revertir la última migración ejecutada
DB_HOST=localhost npm run migration:revert

# Generar una migración automática desde cambios en entidades
# (TypeORM compara la DB contra las entidades y genera el SQL)
DB_HOST=localhost npm run migration:generate -- src/migrations/NombreCambio

# Crear una migración vacía para escribir SQL manualmente
# (útil para seed de datos, renombrar columnas, etc.)
npm run migration:create -- src/migrations/NombreMigracion
```

### Migraciones existentes

| Archivo | Descripción |
|---------|-------------|
| `1000000000000-SeedMonedas` | Inserta las monedas iniciales (ARS, USDT, USD, BTC) |
| `1000000000001-CleanTestDataAndFKMoneda` | Limpia datos de prueba y asegura el seed de monedas |

### Flujo al modificar una entidad

1. Editar el `.entity.ts` correspondiente
2. Generar la migración: `npm run migration:generate -- src/migrations/DescripcionCambio`
3. Revisar el archivo generado en `src/migrations/`
4. Ejecutar: `DB_HOST=localhost npm run migration:run`

# /database — Scripts de base de datos

| Archivo | Tipo | Contenido |
| --- | --- | --- |
| [`schema.sql`](schema.sql) | DDL | Creación de tipos enumerados, tablas, claves primarias/foráneas e índices (PostgreSQL 16). |
| [`seed.sql`](seed.sql) | DML | Categorías y etiquetas iniciales + datos de prueba (usuarios de cada rol, ofertas, postulaciones, mensajes y notificaciones). |

La **fuente de verdad** del modelo es [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). `schema.sql` se genera a partir de él, por lo que ambos siempre coinciden. Durante el desarrollo las migraciones versionadas se generan con Prisma en `backend/prisma/migrations/`.

El diagrama entidad-relación, el diccionario de datos y la justificación de índices están en [`docs/database/modelo-de-datos.md`](../docs/database/modelo-de-datos.md).

## Uso

```bash
# Crear el esquema y cargar datos de prueba en una base vacía
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql

# Regenerar schema.sql luego de modificar schema.prisma (desde backend/)
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > ../database/schema.sql
```

`seed.sql` usa la extensión `pgcrypto` (disponible en PostgreSQL y en Neon) para generar los hashes bcrypt de las contraseñas de prueba. Todas las cuentas de prueba usan la contraseña `Password123!` (ver encabezado del archivo).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Responder siempre en español en este proyecto (código, commits y documentación en inglés como es convención, pero la comunicación con el usuario debe ser en español).

## Estado del proyecto

Es un Trabajo Final Integrador de la Tecnicatura en Programación, desarrollado por Thomas Reynoso, con tutoría de Juan Ignacio Schiavonni. Fechas de entrega: esquema de BD y listado de módulos el 27/09/2026, repositorio completo/despliegue/informe/video el 14/11/2026.

`frontend/` (Vite + React 18 + TS) y `backend/` (NestJS + TS + Prisma) ya están scaffoldeados y arrancan localmente. El esquema de BD y las reglas de negocio están aprobados por el tutor (`backend/prisma/schema.prisma`, migración `init` aplicada; reglas en `docs/database/modelo-de-datos.md` §6, módulos en `docs/modulos.md`). En el backend está implementado M1 (auth: registro de estudiante/empleador, login, `GET /auth/me`, `JwtAuthGuard` + `RolesGuard` globales con `@Public()` / `@Roles()`); el resto de los módulos y todo el frontend siguen pendientes. La API usa el prefijo `/api` y Swagger está en `http://localhost:3000/api/docs`. El repo es un **monorepo con npm workspaces** — esto es un requisito explícito de la cátedra, no una decisión de conveniencia: no separar frontend/backend en repos distintos.

## Producto: Portal de Pasantías y Búsqueda Laboral Estudiantil

Plataforma que conecta estudiantes con empresas que ofrecen pasantías y empleos junior. Hay tres roles de usuario que definen todo el modelo de dominio y el esquema de autorización:

- **Estudiante**: gestiona su perfil (datos de contacto, carrera, CV), busca/filtra ofertas (categoría, modalidad, ubicación), se postula a ofertas y hace seguimiento del estado de la postulación (pendiente / aceptada / rechazada), se mensajea con empleadores.
- **Empleador**: gestiona el perfil de la empresa, publica/edita/cierra ofertas laborales o de pasantías, visualiza y gestiona postulantes por oferta, aprueba/rechaza postulaciones (dispara notificación al estudiante), se mensajea con postulantes.
- **Administrador**: activa/desactiva cuentas de estudiantes y empleadores, modera y da de baja publicaciones, gestiona categorías y etiquetas.

Explícitamente fuera de alcance en esta versión: pasarela de pagos, integraciones con redes sociales externas (ej. LinkedIn), app móvil nativa, notificaciones push. No construir pensando en estas funcionalidades.

## Arquitectura planificada

```
/
├── frontend/          # Cliente React 18 + TypeScript
├── backend/           # API REST con NestJS + TypeScript
│   └── prisma/        # Schema y migraciones de Prisma
├── database/          # DDL (schema.sql, generado desde schema.prisma) y DML (seed.sql)
├── docs/              # arquitectura.md, modulos.md, database/ (DER), informes/
└── README.md
```

- **Frontend**: React 18 + TypeScript, desplegado en Vercel.
- **Backend**: NestJS + TypeScript, exponiendo una API REST, desplegado en Render. El sistema de módulos de NestJS debería mapear naturalmente a los dominios por rol descriptos arriba (ej. un módulo por: auth, estudiantes, empleadores, ofertas, postulaciones, mensajería, admin).
- **Base de datos**: PostgreSQL con Prisma ORM (schema/migraciones en `backend/prisma`), alojada en Neon (Postgres serverless) en producción.
- **Autenticación**: JWT + Passport.js, autenticación stateless para la API REST. La lógica de autorización debe contemplar los tres roles (estudiante / empleador / administrador) en toda la API.

## Desarrollo local

Monorepo con **npm workspaces** (`package.json` raíz con `workspaces: ["backend", "frontend"]`). Un solo `npm install` en la raíz instala ambos paquetes (node_modules hoisteado a la raíz, un único `package-lock.json`). No correr `npm install` por separado dentro de `backend/` o `frontend/`.

```bash
npm install                # desde la raíz, instala frontend y backend
npm run dev:backend        # nest start --watch, en http://localhost:3000/api (Swagger en /api/docs)
npm run dev:frontend       # vite dev, en http://localhost:5173
```

Backend — variables de entorno y base de datos (Prisma + PostgreSQL):
```bash
cd backend
cp .env.example .env       # completar DATABASE_URL y JWT_SECRET (mín. 32 caracteres)
npx prisma migrate dev     # aplica el schema (backend/prisma/schema.prisma)
npx prisma generate        # regenera el cliente en backend/src/generated/prisma (gitignored)
```

Requiere Node.js 20+ y PostgreSQL accesible en `DATABASE_URL`. Para levantar uno local con Docker (evitar el puerto 5432/5433 si ya hay otros proyectos con Postgres corriendo en esta máquina):
```bash
docker run -d --name pasantias-postgres \
  -e POSTGRES_USER=pasantias -e POSTGRES_PASSWORD=pasantias -e POSTGRES_DB=pasantias \
  -p 5434:5432 postgres:16-alpine
```

Nota sobre Prisma: el proyecto está fijado a la versión estable `prisma@7.10.0` / `@prisma/client@7.10.0` (no a la `8.0.0-rc` que instala `npm install prisma` por defecto ahora mismo), para que los comandos clásicos (`prisma migrate dev`, schema.prisma, `prisma.config.ts`) coincidan con lo documentado en el README y no con el CLI rediseñado de la v8. El archivo de config generado se llama `backend/prisma7.config.ts` (nombre por defecto de esta versión del CLI, no un typo).

## Convenciones del repositorio

- El desarrollo está pensado por ramas de módulo (una rama por área funcional/dominio), que se mergean a `main`.
- Un único `.gitignore` en la raíz cubre todo el monorepo (node_modules, dist, .env, cliente generado de Prisma, etc.) — no agregar `.gitignore` sueltos dentro de `frontend/` o `backend/`.

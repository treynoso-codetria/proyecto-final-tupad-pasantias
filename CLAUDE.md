# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Responder siempre en español en este proyecto (código, commits y documentación en inglés como es convención, pero la comunicación con el usuario debe ser en español).

## Estado del proyecto

Es un Trabajo Final Integrador de la Tecnicatura en Programación, desarrollado por Thomas Reynoso, con tutoría de Juan Ignacio Schiavonni. Fechas de entrega: esquema de BD y listado de módulos el 27/09/2026, repositorio completo/despliegue/informe/video el 14/11/2026.

`frontend/` (Vite + React 18 + TS) y `backend/` (NestJS + TS + Prisma) ya están scaffoldeados y arrancan localmente. El esquema de BD y las reglas de negocio están aprobados por el tutor (`backend/prisma/schema.prisma`, migración `init` aplicada; reglas en `docs/database/modelo-de-datos.md` §6, módulos en `docs/modulos.md`). En el backend está implementado M1 (auth: registro de estudiante/empleador, login, `GET /auth/me`, `JwtAuthGuard` + `RolesGuard` globales con `@Public()` / `@Roles()`); en el frontend, login, registro (estudiante/empresa) y una home vacía por rol (`/student`, `/employer`, `/admin`). El resto de los módulos sigue pendiente. La API usa el prefijo `/api` y Swagger está en `http://localhost:3000/api/docs`. El repo es un **monorepo con npm workspaces** — esto es un requisito explícito de la cátedra, no una decisión de conveniencia: no separar frontend/backend en repos distintos.

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

## Frontend: UI y convenciones

- **Stack de UI**: Tailwind CSS v4 + componentes propios en `frontend/src/components/ui` (decisión del autor: no usar shadcn/ui, Chakra ni otra librería de componentes). Para widgets complejos que hagan falta más adelante (modal, select, menú), usar primitivas headless de Radix estilizadas con los mismos tokens.
- **Estilo**: neo-brutalismo suave — bordes `border-2 border-ink`, sombras duras (`shadow-hard-sm` / `shadow-hard` / `shadow-hard-lg`), colores planos sobre fondo `paper`, títulos con `font-display`. Los tokens están en `frontend/src/index.css`.
- **Color por rol**: los componentes usan `bg-accent` / `bg-accent-soft`; el color sale del atributo `data-role` (`STUDENT` violeta, `EMPLOYER` verde, `ADMIN` naranja, sin rol amarillo) más cercano. No hardcodear el color de un rol en un componente.
- **Estructura**: `app/` (router, layout privado), `api/` (cliente HTTP y token), `components/ui/`, `features/<módulo>/`. Imports con el alias `@/` → `src/`. Sin punto y coma, comillas simples.
- **Formularios**: React Hook Form + Zod; los límites de `features/auth/schemas.ts` replican los DTOs del backend.
- **React Router está fijado en v7**: la v8 exige React 19 y el proyecto usa React 18.
- El backend habilita CORS para `CORS_ORIGIN` (por defecto `http://localhost:5173`).

## Internacionalización (i18n)

Ambos proyectos usan **inglés por defecto** y **español** como segundo idioma. Todo texto que ve el usuario va en archivos JSON de traducción, nunca hardcodeado; al agregar una clave hay que agregarla en los dos idiomas.

- **Frontend** (`i18next` + `react-i18next`): un JSON por idioma y namespace en `frontend/src/i18n/locales/{en,es}/` (`common`, `auth`, `home`, `errors`), registrados en `frontend/src/i18n/index.ts`. Las claves de `t()` están tipadas contra el inglés y el build falla si al español le falta una clave. El idioma elegido se guarda en `localStorage` (no se detecta el del navegador: sin elección previa es inglés). El español es rioplatense (voseo). Las rutas del frontend van en inglés.
- **Errores en formularios**: se guardan como claves del namespace `errors` (no como texto) y se traducen al renderizar con `useErrorText()`, para que un error visible cambie de idioma junto con la interfaz.
- **Backend** (`nestjs-i18n`): JSON en `backend/src/i18n/{en,es}/` (`errors.json`, `validation.json`), copiados a `dist/` como assets. El idioma sale de la cabecera `Accept-Language`, que el frontend envía en cada request.
- **Formato de error de la API**: `{ statusCode, code, message }`, armado por `HttpExceptionFilter`. Los services lanzan `new XxxException(ErrorCode.ALGO)` (`backend/src/common/errors/error-code.ts`) y el mensaje se busca en `errors.json` con esa misma clave. El frontend decide por `code`, nunca por el texto de `message`.
- **Validación (class-validator)**: los DTOs no llevan mensajes; el filtro traduce cada error con la clave `validation.<nombre del constraint>` (`isEmail`, `minLength`, …). Para un mensaje propio, pasar `context: { i18nKey: '...' }` al decorador.

## Convenciones del repositorio

- El desarrollo está pensado por ramas de módulo (una rama por área funcional/dominio), que se mergean a `main`.
- Un único `.gitignore` en la raíz cubre todo el monorepo (node_modules, dist, .env, cliente generado de Prisma, etc.) — no agregar `.gitignore` sueltos dentro de `frontend/` o `backend/`.

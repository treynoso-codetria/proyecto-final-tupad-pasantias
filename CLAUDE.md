# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Responder siempre en español en este proyecto (código, commits y documentación en inglés como es convención, pero la comunicación con el usuario debe ser en español).

## Estado del proyecto

Es un Trabajo Final Integrador de la Tecnicatura en Programación, desarrollado por Thomas Reynoso, con tutoría de Juan Ignacio Schiavonni. Fechas de entrega: esquema de BD y listado de módulos el 27/09/2026, repositorio completo/despliegue/informe/video el 14/11/2026.

`frontend/` (Vite + React 19 + TS) y `backend/` (NestJS + TS + Prisma) ya están scaffoldeados y arrancan localmente. El esquema de BD y las reglas de negocio están aprobados por el tutor (`backend/prisma/schema.prisma`, migración `init` aplicada; reglas en `docs/database/modelo-de-datos.md` §6, módulos en `docs/modulos.md`). En el backend está implementado M1 (auth: registro de estudiante/empleador, login, `GET /auth/me`, `JwtAuthGuard` + `RolesGuard` globales con `@Public()` / `@Roles()`); y M2 (cuentas: verificación de email obligatoria para iniciar sesión, cambio de contraseña y cambio de email con confirmación, `MailModule` con Brevo, límite de peticiones con `@nestjs/throttler`). También M3 y M4: perfil propio del estudiante (`/students/me`) y de la empresa (`/companies/me`), vista del perfil del estudiante para empresas a las que se postuló (`GET /students/:id`) y página pública de la empresa con sus ofertas abiertas (`GET /companies/:id`). También M5 (ofertas: búsqueda pública con filtros y paginación en `GET /offers`, detalle, publicar/editar/cerrar para el empleador, "Mis ofertas" con conteo de postulantes) y M6 (lectura pública `GET /categories` y `GET /tags`; administración en `/admin/categories` y `/admin/tags`: alta, renombrado, activar/desactivar categorías, alta/renombrado/baja de etiquetas; el slug se genera del nombre con `modules/catalog/slugify.ts`). Y M7 (postulaciones: `POST /offers/:offerId/applications`, `GET /applications/mine`, `POST /applications/:id/withdraw`, `GET /offers/:offerId/applications`, `PATCH /applications/:id/status`), M8 (notificaciones: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`; hoy se generan al recibir una postulación y al responderla; y con cada mensaje; las de moderación llegan con M11), M9 (archivos: `PUT`/`DELETE /students/me/cv`, `PUT`/`DELETE /companies/me/logo`, `GET /companies/:id/logo` público que redirige a la imagen) y M10 (mensajería: `/conversations`, una conversación por postulación, con notificación `NEW_MESSAGE`). En el frontend: login, registro (estudiante/empresa), pantallas de verificación de email, pantalla de cuenta (`/account`), edición de perfil (`/student/profile`, `/employer/company`), búsqueda y detalle de ofertas y página pública de empresa (`/offers`, `/offers/:id`, `/companies/:id`, públicas: sin sesión también), gestión de ofertas del empleador (`/employer/offers`, `/new`, `/:id/edit`), administración del catálogo (`/admin/catalog`), postularse desde el detalle de la oferta, "Mis postulaciones" (`/student/applications`), postulantes por oferta (`/employer/offers/:id/applications`) con perfil del postulante (`/employer/students/:id`), bandeja de notificaciones (`/notifications`) con campana y contador en la barra superior, subida de CV y logo en los perfiles (el logo se muestra en ofertas y en la página de la empresa), mensajería (`/messages` y `/messages/:applicationId`, para estudiante y empresa, con contador en la navegación), y una home por rol. El resto de los módulos sigue pendiente. La API usa el prefijo `/api` y Swagger está en `http://localhost:3000/api/docs`. El repo es un **monorepo con npm workspaces** — esto es un requisito explícito de la cátedra, no una decisión de conveniencia: no separar frontend/backend en repos distintos.

## Producto: Portal de Pasantías y Búsqueda Laboral Estudiantil

Plataforma que conecta estudiantes con empresas que ofrecen pasantías y empleos junior. Hay tres roles de usuario que definen todo el modelo de dominio y el esquema de autorización:

- **Estudiante**: gestiona su perfil (datos de contacto, carrera, CV), busca/filtra ofertas (categoría, modalidad, ubicación), se postula a ofertas y hace seguimiento del estado de la postulación (pendiente / aceptada / rechazada), se mensajea con empleadores.
- **Empleador**: gestiona el perfil de la empresa, publica/edita/cierra ofertas laborales o de pasantías, visualiza y gestiona postulantes por oferta, aprueba/rechaza postulaciones (dispara notificación al estudiante), se mensajea con postulantes.
- **Administrador**: activa/desactiva cuentas de estudiantes y empleadores, modera y da de baja publicaciones, gestiona categorías y etiquetas.

Explícitamente fuera de alcance en esta versión: pasarela de pagos, integraciones con redes sociales externas (ej. LinkedIn), app móvil nativa, notificaciones push. No construir pensando en estas funcionalidades.

## Arquitectura planificada

```
/
├── frontend/          # Cliente React 19 + TypeScript
├── backend/           # API REST con NestJS + TypeScript
│   └── prisma/        # Schema y migraciones de Prisma
├── database/          # DDL (schema.sql, generado desde schema.prisma) y DML (seed.sql)
├── docs/              # arquitectura.md, modulos.md, database/ (DER), informes/
└── README.md
```

- **Frontend**: React 19 + TypeScript; en producción, archivos estáticos servidos por Caddy.
- **Backend**: NestJS + TypeScript, exponiendo una API REST; en producción, un contenedor Docker detrás de Caddy. El sistema de módulos de NestJS debería mapear naturalmente a los dominios por rol descriptos arriba (ej. un módulo por: auth, estudiantes, empleadores, ofertas, postulaciones, mensajería, admin).
- **Base de datos**: PostgreSQL con Prisma ORM (schema/migraciones en `backend/prisma`), en producción, un contenedor PostgreSQL 18 compartido del servidor (base y usuario `pasantias`).
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

Requiere Node.js 22.22+ (recomendado 24 LTS; lo exigen React Router 8 y las herramientas de Nest) y PostgreSQL accesible en `DATABASE_URL`. Para levantar uno local con Docker (evitar el puerto 5432/5433 si ya hay otros proyectos con Postgres corriendo en esta máquina):
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
- **Datos del servidor**: TanStack Query (`lib/query-client.ts`); cada feature define su `api.ts` con las llamadas y sus query keys. La caché se vacía al cerrar sesión.
- **Formularios de edición**: los valores se manejan como texto (`''` = vacío) y se convierten a `null` al enviar (`lib/form-values.ts`); los campos opcionales reutilizan los esquemas de `lib/form-schemas.ts`. Los controles (`TextField`, `SelectField`, `TextAreaField`) comparten `FieldShell`.
- **Provincias**: lista fija de las 24 jurisdicciones, duplicada a propósito en `frontend/src/lib/provinces.ts` y `backend/src/common/constants/provinces.ts` (el backend la valida); mantener ambas iguales.
- **Páginas públicas**: `AppShell` funciona con y sin sesión (sin sesión muestra "Iniciar sesión"/"Registrarse" y el color de marca). Los filtros de búsqueda de ofertas viven en la URL (`features/offers/filters.ts`). Los diálogos usan `ConfirmDialog` (Radix AlertDialog); `AppShell` copia el rol a `<body data-role>` para que los portales tomen el color del rol.
- **Archivos en el frontend**: `apiFetch` envía un `FormData` tal cual (sin JSON). Las tarjetas de archivo (`FileCard`, `FilePickerButton`, `useFileUpload`) guardan al elegir el archivo, aparte del formulario del perfil. `CompanyLogo` muestra el logo o la inicial de la empresa.
- **Formularios**: React Hook Form + Zod; los límites de `features/auth/schemas.ts` replican los DTOs del backend.
- El backend habilita CORS para `CORS_ORIGIN` (por defecto `http://localhost:5173`).

## Emails y enlaces de cuenta

- **Envío**: `MailService` (`backend/src/mail`) usa la API HTTPS de Brevo, no SMTP (no hay servidor SMTP propio). Sin `BREVO_API_KEY` (desarrollo y tests) no envía nada: escribe el email y su enlace en el log del servidor. En producción `BREVO_API_KEY` y `MAIL_FROM_EMAIL` son obligatorias y el backend no arranca sin ellas.
- **`MailService` nunca lanza**: cada método devuelve si el email salió, y quien llama decide si un fallo es un error para el usuario (reenvío, cambio de email → 503) o no (avisos).
- **Enlaces**: `EmailLinkService` (`modules/auth`) genera enlaces con un JWT firmado y con vencimiento (verificación 24 h, cambio de email 1 h); no hay tabla de tokens. Se firman con una clave derivada de `JWT_SECRET` distinta de la de los tokens de acceso, así que ninguno sirve en lugar del otro. Un enlace deja de valer cuando el email de la cuenta ya no coincide con el que tenía al generarse.
- **Tests e2e**: usan `FakeMailService` (`backend/test/support/test-app.ts`), que captura los emails para seguir sus enlaces. El límite de peticiones está desactivado con `NODE_ENV=test`.
- Los textos de los emails están en `backend/src/i18n/{en,es}/mail.json` y siguen el idioma del request que dispara el envío.

## Archivos (CV y logos)

- **Almacenamiento**: bucket privado de Backblaze B2 por su API S3 (`backend/src/storage`, `S3Storage`). Sin `S3_BUCKET` (desarrollo) se usa `LocalStorage`: disco en `backend/uploads/` y enlaces firmados servidos por `GET /api/files` (fuera de Swagger). En producción `S3_*` y `PUBLIC_API_URL` son obligatorias. Los tests e2e usan un `LocalStorage` en un directorio temporal por corrida (`ctx.storageDir`).
- **En la base va la clave, no un enlace**: `cv_url` / `logo_url` / `applications.cv_url` guardan `cvs/<perfil>/<uuid>.pdf` o `logos/<empresa>/<uuid>.<ext>`. Al armar la respuesta, `StorageService.signedUrl()` da un enlace firmado (CV, privado) y `StorageService.logoUrl()` la ruta pública `/api/companies/:id/logo?v=…`. Nunca devolver la clave cruda.
- **Subidas**: `@FileUpload(UPLOAD_RULES.x, …)` en el controller (multer en memoria, campo `file`, 413 si excede el tamaño) y `checkUpload()` en el service, que decide el tipo por los primeros bytes. Los límites están duplicados en `frontend/src/lib/uploads.ts`; mantener ambos iguales.
- **Borrado**: archivo nuevo = clave nueva; el anterior se borra después de guardar. Un CV solo se borra si ni el perfil ni ninguna postulación lo usan (`deleteCvIfUnused`).

## Despliegue

Servidor propio (droplet de DigitalOcean, Ubuntu 24.04) con Docker: Caddy sirve la SPA y redirige `/api` a la API, PostgreSQL 18 corre en un contenedor compartido con otros proyectos del autor, Backblaze B2 guarda los archivos y Brevo envía los emails. La guía completa está en `docs/despliegue.md`.

En producción desde el 23/10/2026 en <https://pasantias.165-227-8-179.sslip.io> (API en `/api`, Swagger en `/api/docs`; sslip.io hasta tener dominio propio). Antes estaba en Vercel + Render + Neon; los datos se migraron con `pg_dump`.

- Configuración en el repo: `Dockerfile` (etapas `api`, `backend-build` para migraciones y `web` para el frontend) y `deploy/` (`compose.yml`, `site.caddy`, `deploy.sh`, `.env.example`). En el servidor el repo está clonado en `~/apps/pasantias` y los secretos están en `deploy/.env` (no versionado).
- Desplegar: `deploy/deploy.sh [rama]` en el servidor. Actualiza el clon, compila, corre `prisma migrate deploy` (si falla, se corta y sigue la versión anterior), reinicia la API esperando el healthcheck y publica el frontend.
- Frontend y API comparten origen: `PUBLIC_API_URL`, `FRONTEND_URL`, `CORS_ORIGIN` y `VITE_API_URL` (que `deploy.sh` toma de `PUBLIC_API_URL`) valen lo mismo.
- `npm run build` del backend ejecuta antes `prisma generate` (script `prebuild`), porque el cliente generado no se versiona.

## Versiones y dependencias fijadas

Actualizado el 01/10/2026: React 19.3, React Router 8, Vite 8.3, Tailwind 4.3, NestJS 12.1, Vitest 5. Lo que **no** está en la última versión es intencional:

- **Prisma 7.10** (no 8): al 01/10/2026 la v8 solo existe como release candidate del CLI (`prisma@8.0.0-rc.19`); `@prisma/client` y `@prisma/adapter-pg` no tienen ninguna versión 8 publicada. Revisar cuando salga la 8.0.0 estable de los tres paquetes.
- **TypeScript 6 en el backend, 7 en el frontend**: el CLI de Nest (`nest build` / `nest start`) necesita la API de compilación de TypeScript, que la 7.0 no incluye (anunciada para la 7.1); `@nestjs/swagger` además declara `typescript ^5.5 || ^6`. El frontend solo usa `tsc` para chequear tipos, así que usa la 7.
- **`@types/node` 24**: debe coincidir con la versión mayor de Node en uso (24), no con la última publicada.
- **Una sola copia de React**: Prisma Studio (dependencia del backend) también depende de React. Si tras un `npm install` aparecen dos versiones (`npm ls react`), los hooks fallan en runtime aunque el build pase; `frontend/vite.config.ts` tiene `resolve.dedupe` como resguardo.

## Internacionalización (i18n)

Ambos proyectos usan **inglés por defecto** y **español** como segundo idioma. Todo texto que ve el usuario va en archivos JSON de traducción, nunca hardcodeado; al agregar una clave hay que agregarla en los dos idiomas.

- **Frontend** (`i18next` + `react-i18next`): un JSON por idioma y namespace en `frontend/src/i18n/locales/{en,es}/` (`common`, `auth`, `home`, `errors`), registrados en `frontend/src/i18n/index.ts`. Las claves de `t()` están tipadas contra el inglés y el build falla si al español le falta una clave. El idioma elegido se guarda en `localStorage` (no se detecta el del navegador: sin elección previa es inglés). El español es rioplatense (voseo). Las rutas del frontend van en inglés.
- **Errores en formularios**: se guardan como claves del namespace `errors` (no como texto) y se traducen al renderizar con `useErrorText()`, para que un error visible cambie de idioma junto con la interfaz.
- **Backend** (`nestjs-i18n`): JSON en `backend/src/i18n/{en,es}/` (`errors.json`, `validation.json`), copiados a `dist/` como assets. El idioma sale de la cabecera `Accept-Language`, que el frontend envía en cada request.
- **Formato de error de la API**: `{ statusCode, code, message }`, armado por `HttpExceptionFilter`. Los services lanzan `new XxxException(ErrorCode.ALGO)` (`backend/src/common/errors/error-code.ts`) y el mensaje se busca en `errors.json` con esa misma clave. El frontend decide por `code`, nunca por el texto de `message`.
- **IDs**: validar con `ParseIdPipe` (parámetros) e `@IsId()` (DTOs) de `common/validation/ids.ts`, no con `ParseUUIDPipe` / `@IsUUID()`: esos exigen UUID RFC estrictos y rechazan IDs válidos en Postgres como los fijos del seed (`10000000-0000-0000-0000-000000000001`).
- **Rutas públicas con usuario opcional**: en una ruta `@Public()` el `JwtAuthGuard` igual lee un token válido si viene (y lo ignora si es inválido), así que `@CurrentUser()` es `AuthenticatedUser | undefined` ahí. Se usa para que el dueño vea su oferta dada de baja.
- **Notificaciones**: se crean con `NotificationsService.notify({ type, data, userId, link }, tx)` dentro de la misma transacción que el cambio que las origina. `data` guarda los valores del texto y la API arma título y cuerpo en el idioma del request con `i18n/{en,es}/notifications.json` (clave por tipo, o `TIPO.ESTADO` si `data` tiene `status`); `title`/`body` guardan la versión en inglés como respaldo. Para un tipo nuevo: sumarlo a `NotificationContent` y sus textos a los dos JSON. `link` es una ruta del frontend. El frontend consulta el contador cada 30 s (no hay push).
- **Mensajería**: la conversación es la postulación (no hay tabla de conversaciones); solo participan el estudiante y la empresa dueña de la oferta. `NEW_MESSAGE` se crea solo si el destinatario no tiene ya una sin leer de esa conversación (se busca por `data.applicationId`), y `POST /conversations/:id/read` marca leídos los mensajes y esas notificaciones. El frontend consulta el hilo abierto cada 10 s y la bandeja y el contador cada 30 s.
- **"Hoy"**: usar `today()` de `common/dates.ts` (hora de Argentina) para comparar con columnas DATE como `deadline`; `toIsoDate()` para enviarlas como `YYYY-MM-DD`.
- **Endpoints PATCH**: solo cambian los campos enviados. Los campos anulables se vacían con `null` o `''` (`@IsOptional()` + `@EmptyToNull()`); los obligatorios usan `@IfDefined()` para poder omitirse pero no anularse (`common/decorators/optional-fields.decorator.ts`).
- **Validación (class-validator)**: los DTOs no llevan mensajes; el filtro traduce cada error con la clave `validation.<nombre del constraint>` (`isEmail`, `minLength`, …). Para un mensaje propio, pasar `context: { i18nKey: '...' }` al decorador.

## Convenciones del repositorio

- El desarrollo está pensado por ramas de módulo (una rama por área funcional/dominio), que se mergean a `main`.
- Un único `.gitignore` en la raíz cubre todo el monorepo (node_modules, dist, .env, cliente generado de Prisma, etc.) — no agregar `.gitignore` sueltos dentro de `frontend/` o `backend/`.

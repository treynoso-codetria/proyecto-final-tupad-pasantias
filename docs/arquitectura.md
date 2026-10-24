# Arquitectura del proyecto — Portal de Pasantías

## 1. Visión general

El sistema sigue una arquitectura **cliente-servidor desacoplada** de tres niveles:

1. **Cliente (SPA)** — aplicación React que se ejecuta en el navegador.
2. **API REST** — backend NestJS organizado como un **monolito modular en capas**.
3. **Base de datos** — PostgreSQL gestionado con Prisma ORM.

El cliente y la API se comunican exclusivamente por HTTP/JSON. En producción los sirve el mismo servidor bajo un único origen (la SPA como archivos estáticos y la API en `/api`). Ambos viven en el **mismo repositorio** (monorepo con npm workspaces).

```mermaid
flowchart LR
    subgraph Cliente["Navegador"]
        SPA["SPA React 19 + TS"]
    end
    subgraph Servidor["Servidor propio (Docker)"]
        API["API REST NestJS<br/>JWT + Passport"]
        DB[("PostgreSQL")]
    end
    FS[["Almacenamiento de archivos<br/>(Backblaze B2)"]]

    SPA -- "HTTPS / JSON<br/>Authorization: Bearer JWT" --> API
    API -- "Prisma Client (SQL/TLS)" --> DB
    API -- "SDK: carga de CV y logos" --> FS
    SPA -- "descarga de archivos por URL" --> FS
```

### ¿Por qué un monolito modular y no microservicios?

| Criterio | Monolito modular | Microservicios |
| --- | --- | --- |
| Tamaño del equipo (1 desarrollador) | Adecuado | Sobrecosto de operación y coordinación |
| Despliegue en un servidor chico | 1 contenedor | N contenedores, cada uno con su memoria y su configuración |
| Transacciones (ej. registro = usuario + perfil) | Una transacción de base | Requiere coordinación distribuida |
| Separación por dominios | Módulos de NestJS con límites claros | Servicios independientes |

Los módulos de NestJS dan la separación por dominio que buscaríamos en microservicios (cada módulo expone solo sus *services* públicos), sin la complejidad operativa. Si en el futuro un dominio necesitara escalar aparte, los límites ya están definidos.

---

## 2. Arquitectura del backend (NestJS)

### 2.1 Capas

Cada módulo funcional (ver [listado de módulos](modulos.md)) respeta las mismas capas:

```mermaid
flowchart TB
    R["Request HTTP"] --> G["Guards<br/>JwtAuthGuard · RolesGuard"]
    G --> P["Pipes<br/>ValidationPipe (DTO + class-validator)"]
    P --> C["Controller<br/>rutas, códigos HTTP, mapeo de DTOs"]
    C --> S["Service<br/>reglas de negocio y autorización por recurso"]
    S --> D["PrismaService<br/>acceso a datos"]
    D --> DB[("PostgreSQL")]
    S -. "eventos internos" .-> N["NotificationsService"]
    F["Exception Filter global"] -.-> R
```

| Capa | Responsabilidad | No debe |
| --- | --- | --- |
| **Controller** | Definir endpoints REST, recibir/validar DTOs, devolver respuestas. | Contener lógica de negocio ni acceder a Prisma. |
| **Service** | Reglas de negocio (ej. "solo se puede postular a ofertas abiertas"), verificación de que el recurso pertenece al usuario, transacciones. | Conocer detalles HTTP (request/response). |
| **Acceso a datos** | `PrismaService` (singleton inyectable) con el cliente tipado generado del schema. | — |
| **DTOs** | Contratos de entrada/salida validados con `class-validator` y documentados con Swagger. | Exponer campos sensibles (ej. `password_hash`). |

Prisma ya cumple el rol de repositorio (cliente tipado por modelo), por lo que no se agrega una capa *repository* adicional para no duplicar código. Las consultas complejas (búsqueda de ofertas con filtros) se encapsulan en métodos del service.

### 2.2 Autenticación y autorización

- **Autenticación:** login con email + contraseña (bcrypt). La API emite un **JWT firmado (HS256)** con `sub` (id de usuario), `role` y expiración. El cliente lo envía en `Authorization: Bearer <token>`. No hay sesión en el servidor (*stateless*), lo que simplifica el despliegue: reiniciar o reemplazar el contenedor de la API no cierra ninguna sesión.
- **Autorización en dos niveles:**
  1. **Por rol** — `RolesGuard` + `@Roles('EMPLOYER')` en cada endpoint.
  2. **Por recurso** — en el service se verifica la pertenencia (ej. un empleador solo edita sus propias ofertas y solo ve postulantes de ellas).
- Las cuentas desactivadas por un administrador son rechazadas en la estrategia JWT aunque tengan un token vigente.

### 2.3 Estructura de carpetas planificada

```
backend/
├── prisma/
│   ├── schema.prisma          # modelo de datos (fuente de verdad)
│   └── migrations/            # migraciones generadas por Prisma
└── src/
    ├── main.ts                # bootstrap: ValidationPipe, CORS, Swagger
    ├── app.module.ts
    ├── common/                # guards, decorators, filters, pipes compartidos
    ├── config/                # carga y validación de variables de entorno
    ├── prisma/                # PrismaModule / PrismaService
    └── modules/
        ├── auth/              # M1
        ├── users/             # M2
        ├── students/          # M3
        ├── companies/         # M4
        ├── offers/            # M5
        ├── catalog/           # M6 (categorías y etiquetas)
        ├── applications/      # M7
        ├── notifications/     # M8
        ├── files/             # M9
        ├── messages/          # M10
        └── admin/             # M11
```

Cada carpeta de `modules/` contiene `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/` y sus tests `*.spec.ts`.

### 2.4 Convenciones de la API

- Recursos en plural y en inglés: `/offers`, `/offers/:id/applications`, `/applications/:id/messages`, `/admin/users/:id/deactivate`.
- Prefijo global `/api` y documentación Swagger en `/api/docs`.
- Paginación con `?page=&limit=`; filtros por query string (`/offers?category=...&modality=REMOTE&type=INTERNSHIP`).
- Códigos HTTP estándar: `201` creación, `400` validación, `401` sin token, `403` rol/recurso no permitido, `404`, `409` conflicto (ej. postulación duplicada).

---

## 3. Arquitectura del frontend (React)

- **SPA** construida con **Vite**, con **React Router** para la navegación y rutas protegidas por rol (`/student/*`, `/employer/*`, `/admin/*`).
- **Organización por *features*** que replica los módulos del backend:

```
frontend/src/
├── app/            # router, providers, layout principal
├── api/            # cliente HTTP (fetch/axios) con interceptor del JWT
├── components/     # componentes de UI reutilizables
├── features/
│   ├── auth/
│   ├── offers/
│   ├── applications/
│   ├── profile/
│   ├── messages/
│   ├── notifications/
│   └── admin/
├── hooks/
└── types/
```

- **Estado del servidor:** TanStack Query (caché, reintentos, invalidación y *polling* para notificaciones y mensajes).
- **Formularios:** React Hook Form + Zod para validación en el cliente.
- **Estado de sesión:** contexto de React con el usuario autenticado y su rol.

---

## 4. Tecnologías definitivas

| Capa | Tecnología | Justificación |
| --- | --- | --- |
| Lenguaje | **TypeScript** (frontend y backend) | Un solo lenguaje en todo el stack; tipado estático que detecta errores en compilación y permite compartir convenciones entre cliente y servidor. |
| Frontend | **React 19** + **Vite** | Biblioteca UI más difundida del mercado; Vite ofrece arranque y *hot reload* rápidos. |
| Ruteo / datos (FE) | React Router, TanStack Query, React Hook Form + Zod | Estándares de facto; resuelven navegación, caché de datos remotos y validación de formularios sin escribir infraestructura propia. |
| Backend | **NestJS** | Arquitectura modular, inyección de dependencias y decoradores que imponen la separación en capas; integración oficial con Passport, JWT, Swagger y validación. |
| Validación (BE) | class-validator + class-transformer | Integración nativa con los `ValidationPipe` de NestJS. |
| Base de datos | **PostgreSQL 16** | Motor relacional robusto: el dominio es fuertemente relacional (usuarios, ofertas, postulaciones, mensajes) y necesita integridad referencial, restricciones únicas y transacciones. |
| ORM | **Prisma 7** | Schema declarativo como fuente de verdad, migraciones versionadas y cliente 100 % tipado generado a partir del modelo. |
| Autenticación | **JWT + Passport.js** (`@nestjs/jwt`, `passport-jwt`), bcrypt | Autenticación *stateless*, estándar para APIs REST y compatible con despliegue en servicios sin estado. |
| Documentación API | Swagger / OpenAPI (`@nestjs/swagger`) | Documentación generada desde el código; sirve como contrato entre frontend y backend. |
| Almacenamiento de archivos | **Backblaze B2** (API S3, plan gratuito) | Los CV y logos se guardan fuera de la base, en un bucket privado con enlaces firmados (ver §6). |
| Testing | Vitest + Supertest | Ya configurados en el backend; tests unitarios de services y e2e de endpoints. |
| Calidad | Oxlint + Prettier | Linter rápido y formato uniforme en todo el monorepo. |
| Despliegue | **Servidor propio** (DigitalOcean) con **Docker** | Frontend, API y base en un mismo servidor de costo fijo, sin el arranque en frío ni la suspensión de los planes gratuitos. Imágenes definidas en el `Dockerfile` del repo. |
| Proxy y HTTPS | **Caddy** | Sirve la SPA estática, redirige `/api` a la API y obtiene los certificados de Let's Encrypt solo. |
| Emails | **Brevo** (API HTTPS) | Envío transaccional gratuito (300 por día) sin depender de SMTP. |
| Repositorio / CI | Git + GitHub (monorepo npm workspaces) + GitHub Actions | Requisito de la cátedra: un único repositorio; CI para lint, tests y build en cada PR. |

---

## 5. Entornos y despliegue

```mermaid
flowchart LR
    Dev["Desarrollo local<br/>Vite :5173 · Nest :3000<br/>Postgres en Docker :5434"] -->|push / PR| GH["GitHub<br/>Actions: lint + test + build"]
    GH -->|deploy/deploy.sh| S["Servidor<br/>build de imágenes Docker"]
    S -->|prisma migrate deploy| N[("PostgreSQL")]
    S --> A["API NestJS<br/>(contenedor)"]
    S --> C["Caddy<br/>SPA estática + /api"]
```

| Variable | Dónde | Uso |
| --- | --- | --- |
| `DATABASE_URL` | backend | Conexión a PostgreSQL. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | backend | Firma y duración de los tokens. |
| `CORS_ORIGIN` | backend | URL del frontend permitida. |
| `S3_*`, `PUBLIC_API_URL` | backend | Bucket de archivos y URL pública de la API (enlaces a logos). |
| `BREVO_API_KEY`, `MAIL_FROM_EMAIL` | backend | Envío de emails. |
| `VITE_API_URL` | frontend | URL base de la API. |

Las migraciones se aplican con `prisma migrate deploy` en cada despliegue, antes de reiniciar la API; si una falla, sigue en línea la versión anterior. Los secretos viven en `deploy/.env` en el servidor, nunca en el repositorio (`.env` está en `.gitignore`; solo se versiona `.env.example`). Detalle en [despliegue.md](despliegue.md).

---

## 6. Almacenamiento de archivos

- Los archivos viven en un bucket **privado** de [Backblaze B2](https://www.backblaze.com/cloud-storage), accedido con su API compatible con S3 (`@aws-sdk/client-s3`), así que cambiar a otro servicio S3 (Cloudflare R2, AWS) es cuestión de configuración. Se eligió frente a Cloudinary (previsto al principio) porque su plan gratuito bloquea la entrega de PDF y publica los archivos en URLs abiertas, y un CV tiene datos personales. En desarrollo y tests el backend guarda en disco local (`LocalStorage`), con el mismo comportamiento.
- Los CV (PDF) y logos se suben **a través del backend** (`multipart/form-data`, campo `file`), que valida el tamaño (CV hasta 5 MB, logo hasta 2 MB) y el tipo **por el contenido** del archivo (sus primeros bytes), no por el nombre ni por el tipo que declara el navegador.
- En la base se guarda la **clave** del archivo en el almacenamiento (`cvs/<perfil>/<uuid>.pdf`, `logos/<empresa>/<uuid>.png`) en `student_profiles.cv_url` y `companies.logo_url`, y para el CV también su nombre original. Cada archivo nuevo usa una clave nueva: reemplazar nunca pisa el anterior.
- La API convierte las claves en enlaces al armar cada respuesta:
  - **CV**: enlace firmado que vence (al menos una hora). Solo lo reciben quienes pueden ver ese perfil o postulación, así que el control de acceso es el de la API.
  - **Logo**: es público, así que su enlace es una ruta fija de la API (`/api/companies/:id/logo?v=…`) que redirige a un enlace firmado. El parámetro `v` cambia con cada logo nuevo para que el navegador no muestre uno viejo.
  - Los enlaces se firman por ventanas de una hora, así que el mismo archivo conserva el mismo enlace un rato y el navegador lo aprovecha desde su caché.
- Al postularse se copia la clave del CV vigente a `applications.cv_url`, para que la empresa vea el CV con el que se postuló el estudiante. Por eso, al reemplazar o borrar un CV, el archivo anterior solo se elimina si ninguna postulación lo usa.

---

## 7. Seguridad

- Contraseñas con **bcrypt** (nunca en texto plano ni en respuestas de la API).
- Validación y *whitelisting* de todos los DTOs de entrada (`whitelist: true`, `forbidNonWhitelisted: true`).
- Prisma usa consultas parametrizadas (previene inyección SQL).
- CORS restringido al dominio del frontend; cabeceras de seguridad con Helmet.
- Límite de intentos en login (`@nestjs/throttler`).
- IDs UUID no enumerables en todas las URLs.
- Autorización por rol **y** por pertenencia del recurso en cada operación de escritura.

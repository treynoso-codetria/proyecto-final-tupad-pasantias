# Entrega final — Portal de Pasantías y Búsqueda Laboral Estudiantil

**Proyecto:** Portal de Pasantías y Búsqueda Laboral Estudiantil
**Carrera:** Tecnicatura Universitaria en Programación — Trabajo Final Integrador
**Integrante:** Thomas Reynoso
**Tutor:** Juan Ignacio Schiavonni
**Fecha:** 14/11/2026

---

## 1. Resumen

El Portal de Pasantías es una aplicación web que conecta a **estudiantes** con **empresas** que ofrecen pasantías y empleos junior. Las empresas publican ofertas, los estudiantes las buscan y se postulan, las empresas aceptan o rechazan las postulaciones y las dos partes se comunican por mensajes internos. Un **administrador** modera las cuentas y las publicaciones y mantiene el catálogo de categorías y etiquetas.

Se implementaron los **once módulos funcionales** del plan aprobado en la 2.ª entrega (M1 a M11) más el módulo transversal de infraestructura, calidad y despliegue (M12). La aplicación está en producción, en inglés y en español, con integración continua y tests automáticos.

| | |
| --- | --- |
| Aplicación | <https://pasantias.165-227-8-179.sslip.io> |
| API (REST) | <https://pasantias.165-227-8-179.sslip.io/api> |
| Documentación de la API (Swagger) | <https://pasantias.165-227-8-179.sslip.io/api/docs> |
| Repositorio | <https://github.com/treynoso-codetria/proyecto-final-tupad-pasantias> |
| Video de presentación | <https://youtu.be/BZSSqYAoDoc> |

### Cuentas de prueba

Todas usan la contraseña `Password123!`.

| Rol | Email |
| --- | --- |
| Administrador | `admin@pasantias.dev` |
| Empresa (TechSur S.A.) | `rrhh@techsur.dev` |
| Empresa (DataCorp SRL) | `talento@datacorp.dev` |
| Estudiante | `ana.gomez@alumnos.dev` |
| Estudiante | `lucas.perez@alumnos.dev` |

También se puede registrar una cuenta nueva de estudiante o de empresa: el enlace de verificación llega por email.

---

## 2. Contenido entregado

| Requisito | Ubicación |
| --- | --- |
| Código fuente (monorepo con npm workspaces) | [`frontend/`](../../frontend), [`backend/`](../../backend) |
| Esquema de base de datos y migraciones | [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma), [`backend/prisma/migrations/`](../../backend/prisma/migrations) |
| Scripts DDL / DML | [`database/schema.sql`](../../database/schema.sql), [`database/seed.sql`](../../database/seed.sql) |
| Modelo de datos (DER, diccionario, índices, reglas) | [`docs/database/modelo-de-datos.md`](../database/modelo-de-datos.md) |
| Módulos, prioridades y detalle de lo implementado | [`docs/modulos.md`](../modulos.md) |
| Arquitectura y tecnologías | [`docs/arquitectura.md`](../arquitectura.md) |
| Guía de despliegue y operación | [`docs/despliegue.md`](../despliegue.md) |
| Integración continua | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| Configuración de producción | [`Dockerfile`](../../Dockerfile), [`deploy/`](../../deploy) |
| Instrucciones de instalación y uso | [`README.md`](../../README.md) |
| Informes anteriores | [`entrega-1-propuesta.docx`](entrega-1-propuesta.docx), [`entrega-2.md`](entrega-2.md) |

---

## 3. Funcionalidades por rol

### Estudiante

- Registro con verificación de email obligatoria; cambio de contraseña y de email (con confirmación por enlace).
- Perfil con datos personales y de contacto, carrera, institución, año, ubicación, presentación, portfolio y **CV en PDF**.
- **Búsqueda de ofertas** por texto con filtros por categoría, etiquetas, tipo (pasantía / empleo), modalidad, carga horaria y provincia, con paginación y orden. Los filtros quedan en la URL, así que una búsqueda se puede compartir.
- Detalle de la oferta y página pública de cada empresa.
- **Postulación** con mensaje de presentación; el CV del momento queda guardado con la postulación.
- "Mis postulaciones" con el estado de cada una (pendiente / aceptada / rechazada / retirada) y opción de retirar una pendiente.
- **Mensajería** con la empresa por cada postulación, y **notificaciones** (postulación respondida, mensaje nuevo).

### Empresa

- Registro con CUIT y verificación de email; perfil de la empresa con **logo**.
- **Publicar, editar y cerrar ofertas**, con categoría, etiquetas, salario, vacantes y fecha límite.
- "Mis ofertas" con la cantidad de postulantes (total y pendientes) por oferta.
- Lista de postulantes por oferta, filtrable por estado, con acceso al perfil y al CV de cada uno; **aceptar o rechazar** (el estudiante recibe una notificación).
- Mensajería con los postulantes y notificaciones (postulación nueva, mensaje nuevo, oferta dada de baja o restaurada).

### Administrador

- **Panel** con métricas: estudiantes y empresas (totales y activos), ofertas por estado y postulaciones por estado, más las últimas acciones de moderación.
- **Cuentas**: búsqueda de estudiantes y empresas; **activar / desactivar** con motivo. La persona recibe un email y una notificación.
- **Ofertas**: listado de todas las ofertas en cualquier estado; **dar de baja** con motivo y **restaurar**. La empresa recibe una notificación con el motivo.
- **Catálogo**: alta, renombrado y activación de categorías; alta, renombrado y baja de etiquetas.
- **Actividad**: registro de todas las acciones de moderación, con quién, cuándo y por qué.

### Para todos

- Interfaz en **inglés y español** (selector de idioma); la API responde los errores, las notificaciones y los emails en el idioma de la interfaz.
- Bandeja de notificaciones con contador en la barra superior.
- Diseño responsive, con un color por rol para saber siempre en qué área se está.

---

## 4. Módulos implementados

| # | Módulo | Prioridad | Estado |
| --- | --- | --- | --- |
| M1 | Autenticación y autorización | Alta | ✅ Implementado |
| M2 | Gestión de usuarios y cuentas | Alta | ✅ Implementado |
| M3 | Perfil del estudiante | Alta | ✅ Implementado |
| M4 | Perfil de la empresa | Alta | ✅ Implementado |
| M5 | Ofertas laborales y pasantías | Alta | ✅ Implementado |
| M6 | Categorías y etiquetas | Alta | ✅ Implementado |
| M7 | Postulaciones | Alta | ✅ Implementado |
| M8 | Notificaciones | Media | ✅ Implementado |
| M9 | Almacenamiento de archivos (CV y logos) | Media | ✅ Implementado |
| M10 | Mensajería interna | Media | ✅ Implementado |
| M11 | Panel de administración y moderación | Media | ✅ Implementado |
| M12 | Infraestructura, calidad y despliegue | Alta | ✅ Implementado |

El detalle de cada módulo, con sus reglas de negocio y endpoints, está en [`docs/modulos.md`](../modulos.md). Cada módulo se desarrolló en su propia rama (`feature/<módulo>`) y se integró a `main` al terminarlo, siguiendo el orden de etapas del plan.

---

## 5. Arquitectura y tecnologías

Aplicación de página única (SPA) en React que consume una **API REST** en NestJS, organizada como un **monolito modular en capas** (controller → service → Prisma). Cada módulo funcional es un módulo de NestJS en el backend y una carpeta de `features/` en el frontend. La justificación completa está en [`docs/arquitectura.md`](../arquitectura.md).

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS 4, Radix (diálogos), i18next |
| Backend | NestJS 12, TypeScript, Passport + JWT, class-validator, nestjs-i18n, Swagger (OpenAPI) |
| Base de datos | PostgreSQL 18 con Prisma ORM 7 (11 tablas, 8 tipos enumerados, migraciones versionadas) |
| Archivos | Backblaze B2 (bucket privado, API S3) con enlaces firmados que vencen |
| Emails | Brevo (API HTTPS) |
| Producción | Servidor propio (DigitalOcean, Ubuntu 24.04) con Docker y Caddy (HTTPS automático) |
| Calidad | Vitest, Supertest, oxlint, GitHub Actions |

### Decisiones principales

- **Autenticación stateless con JWT** y dos guards globales: `JwtAuthGuard` (todo requiere sesión salvo lo marcado `@Public()`) y `RolesGuard` (`@Roles(...)`). El usuario se relee en cada request, así que una cuenta desactivada queda afuera aunque su token siga vigente. Además del rol, cada operación de escritura verifica que el recurso pertenezca a quien la hace.
- **Bajas lógicas**: desactivar una cuenta o dar de baja una oferta no borra datos. El resto de la API ya oculta las cuentas inactivas y las ofertas dadas de baja, así que reactivar o restaurar deja todo como estaba.
- **Efectos en la misma transacción**: cada cambio que genera una notificación (y, en moderación, su registro en `admin_actions`) se guarda junto con ella.
- **Errores con código estable**: la API responde `{ statusCode, code, message }`. El frontend decide por `code` y muestra su propio texto traducido.
- **Archivos privados**: en la base se guarda la clave del archivo, nunca un enlace. El tipo se valida por el contenido (no por la extensión) y los CV se entregan con enlaces firmados que vencen.
- **Notificaciones por consulta periódica** (cada 30 s, y cada 10 s en una conversación abierta) en lugar de WebSockets, de acuerdo con el alcance acordado.

---

## 6. Calidad

- **Tests automáticos**: 59 tests unitarios (servicios críticos, guards, slugs, almacenamiento, emails, traducciones) y **157 tests end-to-end** en 12 archivos que recorren la API real contra PostgreSQL: autenticación, cuentas, perfiles, ofertas, catálogo, postulaciones, notificaciones, archivos, mensajería y moderación.
- **Integración continua** (GitHub Actions) en cada push: lint, chequeo de tipos, tests unitarios, migraciones sobre una base vacía, tests e2e y build del backend; lint y build del frontend. Ningún cambio llegó a `main` con la CI en rojo.
- **Validación** de todos los datos de entrada en el backend (DTOs con lista blanca de campos) y los mismos límites replicados en los formularios del frontend.
- **Seguridad**: contraseñas con bcrypt, límite de peticiones (más estricto en login y en los envíos de email), consultas parametrizadas (Prisma), CORS restringido, HTTPS obligatorio, enlaces de email firmados y con vencimiento.
- **Traducciones verificadas en el build**: si al español le falta una clave del inglés, el frontend no compila.
- **Carga diferida**: cada página del frontend se descarga recién cuando se visita, lo que reduce la descarga inicial a menos de la mitad.
- **Documentación de la API** generada con Swagger, con los códigos de error de cada endpoint.

---

## 7. Despliegue

La aplicación corre en un servidor propio con Docker: Caddy sirve el frontend y redirige `/api` al contenedor de la API, y PostgreSQL 18 corre en un contenedor del mismo servidor. Los archivos van a Backblaze B2 y los emails salen por Brevo.

Un despliegue se hace con un solo comando en el servidor (`deploy/deploy.sh`): actualiza el código, compila las imágenes, aplica las migraciones (si fallan, se corta y sigue la versión anterior), reinicia la API esperando que responda y recién entonces publica el frontend nuevo. El procedimiento completo, incluida la preparación de un servidor nuevo, está en [`docs/despliegue.md`](../despliegue.md).

---

## 8. Cambios respecto de la propuesta

| Propuesta | Resultado | Motivo |
| --- | --- | --- |
| Equipo de varios integrantes | Un único desarrollador | Cambio en la conformación del equipo, ya informado en la 2.ª entrega. El plan por etapas permitió completar igualmente todos los módulos. |
| Cloudinary para CV y logos | Backblaze B2 (API S3) | El plan gratuito de Cloudinary bloquea la entrega de PDF y publica los archivos en URLs abiertas; un CV tiene datos personales y debe ser privado. |
| Vercel + Render + Neon | Servidor propio con Docker y Caddy | Se desplegó primero en esos servicios. El 23/10 se migró a un servidor propio para evitar el arranque en frío de Render (cerca de un minuto tras 15 minutos sin uso) y la suspensión de la base de Neon. Los datos se migraron con `pg_dump`. |
| Interfaz en un idioma | Inglés y español | Se sumó la internacionalización completa de interfaz, errores, notificaciones y emails. |
| Postulación pendiente / aceptada / rechazada | Se agregó "retirada" | Permite que el estudiante retire una postulación pendiente (y vuelva a postularse). Ya figuraba en la 2.ª entrega. |
| — | Verificación de email obligatoria | Agregada en M2 para evitar cuentas con emails ajenos o mal escritos. |

---

## 9. Limitaciones y trabajo futuro

- **Dominio propio**: hoy se usa `sslip.io`, que resuelve el nombre a la IP del servidor. Con un dominio propio solo cambian las variables de URL.
- **Notificaciones en tiempo real**: la consulta periódica es suficiente para el volumen actual; con más uso convendría WebSockets o Server-Sent Events.
- **Cabeceras de seguridad HTTP** (CSP, `X-Frame-Options`, etc.): estaban previstas con Helmet y no llegaron a configurarse; se pueden agregar en la API o en Caddy sin cambiar el resto.
- **Recuperación de contraseña** por email ("olvidé mi contraseña"): no estaba en el alcance aprobado y es la próxima funcionalidad de cuentas a sumar.
- **Fuera de alcance** según la propuesta: pagos, integración con redes sociales (LinkedIn), app móvil nativa y notificaciones push.

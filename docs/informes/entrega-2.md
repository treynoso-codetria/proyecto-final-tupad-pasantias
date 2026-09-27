# 2.ª Entrega — Esquema de base de datos y listado de módulos

**Proyecto:** Portal de Pasantías y Búsqueda Laboral Estudiantil
**Integrante:** Thomas Reynoso
**Tutor:** Juan Ignacio Schiavonni
**Fecha:** 27/09/2026

## Contenido entregado

| Requisito de la consigna | Ubicación en el repositorio |
| --- | --- |
| Esquema de base de datos (DER, tablas, campos, tipos, PK/FK, relaciones, índices) | [`docs/database/modelo-de-datos.md`](../database/modelo-de-datos.md), [`docs/database/der.png`](../database/der.png) |
| Scripts DDL / DML | [`database/schema.sql`](../../database/schema.sql), [`database/seed.sql`](../../database/seed.sql) |
| Schema de Prisma (fuente de verdad del modelo) | [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) |
| Listado de módulos con descripción y prioridad | [`docs/modulos.md`](../modulos.md) |
| Arquitectura, tecnologías definitivas y justificación | [`docs/arquitectura.md`](../arquitectura.md) |
| Estructura del repositorio y README actualizado | [`README.md`](../../README.md) |

## Resumen del avance

- Se diseñó un modelo **relacional** de 11 tablas y 8 tipos enumerados que cubre los tres roles (estudiante, empleador, administrador), ofertas con categorías y etiquetas, postulaciones con seguimiento de estado, mensajería interna, notificaciones y bitácora de moderación.
- El DDL se generó desde el schema de Prisma y se verificó aplicándolo junto con el seed sobre PostgreSQL 16.
- Se definieron **12 módulos** (11 funcionales + 1 transversal), priorizados en función del flujo principal del MVP, con un orden de desarrollo en 4 etapas.
- Se definió la arquitectura: SPA React + API REST NestJS como monolito modular en capas, PostgreSQL/Prisma, JWT, y despliegue en Vercel / Render / Neon.

## Cambios respecto de la 1.ª entrega

- El equipo pasa a estar integrado por un único desarrollador. La planificación de módulos y el orden de desarrollo por etapas contemplan este cambio.
- Los scripts de base de datos se ubican en `/database` (la propuesta indicaba `/backend/db`), para cumplir con la estructura pedida en esta consigna. Las migraciones de Prisma siguen en `backend/prisma/`.
- Se incorpora **Cloudinary** como servicio de almacenamiento de CV y logos, necesario porque el disco de Render (plan gratuito) es efímero.
- Se agrega el estado `WITHDRAWN` (postulación retirada por el estudiante) a los estados pendiente / aceptada / rechazada.

## Próximos pasos (sujetos a la aprobación del tutor)

1. Etapa 1 del plan de módulos: infraestructura (M12), autenticación (M1), usuarios (M2) y catálogos (M6).
2. Primera migración de Prisma y despliegue inicial en Render + Neon.

# 🎓 Portal de Pasantías y Búsqueda Laboral Estudiantil

Plataforma web que conecta **estudiantes** con **empresas** que ofrecen pasantías y empleos junior, facilitando la publicación de ofertas, la postulación y la comunicación entre ambas partes.

Desarrollado como **Trabajo Final Integrador** de la Tecnicatura en Programación.

---

## 👤 Integrante

| Nombre         | GitHub                                                     |
| -------------- | ---------------------------------------------------------- |
| Thomas Reynoso | [@treynoso-codetria](https://github.com/treynoso-codetria) |

**Tutora/Tutor:** Juan Ignacio Schiavonni

---

## 🚀 Funcionalidades principales

### Estudiante

- Registro y gestión de perfil (datos de contacto, carrera, CV)
- Búsqueda y filtrado de ofertas por categoría, modalidad y ubicación
- Postulación a ofertas con seguimiento de estado (pendiente / aceptada / rechazada)
- Mensajería interna con empleadores

### Empleador

- Registro y gestión del perfil de la empresa
- Publicación, edición y cierre de ofertas laborales o pasantías
- Visualización y gestión de postulantes por oferta
- Aprobación / rechazo de postulaciones con notificación automática
- Mensajería interna con postulantes

### Administrador

- Panel de administración general
- Activación y desactivación de cuentas
- Moderación y baja de publicaciones
- Gestión de categorías y etiquetas

---

## 🛠️ Stack Tecnológico

| Capa                  | Tecnología                   |
| --------------------- | ---------------------------- |
| Frontend              | React 19 + TypeScript        |
| Backend               | NestJS + TypeScript          |
| Base de datos         | PostgreSQL + Prisma ORM      |
| Autenticación         | JWT + Passport.js            |
| Deploy Frontend       | [Vercel](https://vercel.com) |
| Deploy Backend        | [Render](https://render.com) |
| Base de datos (cloud) | [Neon](https://neon.tech)    |
| Control de versiones  | Git + GitHub                 |
| Almacenamiento de archivos | Cloudinary (CV y logos) |

Arquitectura: SPA React + API REST NestJS organizada como **monolito modular en capas**. Detalle y justificación en [`docs/arquitectura.md`](docs/arquitectura.md).

---

## 📚 Documentación

| Documento | Ubicación |
| --- | --- |
| Arquitectura y tecnologías | [`docs/arquitectura.md`](docs/arquitectura.md) |
| Listado de módulos y prioridades | [`docs/modulos.md`](docs/modulos.md) |
| Modelo de datos (DER, diccionario, índices) | [`docs/database/modelo-de-datos.md`](docs/database/modelo-de-datos.md) |
| Scripts DDL / DML | [`database/`](database/) |
| Informes de avance | [`docs/informes/`](docs/informes/) |

---

## ☁️ Despliegue

| Servicio      | URL                          |
| ------------- | ---------------------------- |
| Frontend      | [enlace pendiente]           |
| Backend (API) | [enlace pendiente]           |
| Base de datos | Neon (PostgreSQL serverless) |

---

## 📁 Estructura del repositorio

```
/
├── frontend/              # Cliente React 19 + TypeScript (Vite)
├── backend/               # API REST con NestJS + TypeScript
│   └── prisma/
│       └── schema.prisma  # Modelo de datos (fuente de verdad)
├── database/              # Scripts DDL (schema.sql) y DML (seed.sql)
├── docs/
│   ├── arquitectura.md    # Arquitectura, tecnologías y justificación
│   ├── modulos.md         # Listado de módulos y prioridades
│   ├── database/          # DER y diccionario de datos
│   └── informes/          # Informes de avance por entrega
├── package.json           # Monorepo (npm workspaces)
└── README.md
```

---

## ⚙️ Instalación y ejecución local

Este repositorio es un **monorepo** (npm workspaces): `frontend/` y `backend/` comparten un único `package.json` raíz e instalación de dependencias.

### Requisitos previos

- Node.js 22.22+ (recomendado: 24 LTS)
- PostgreSQL (local, por ejemplo vía Docker, o una instancia en Neon)

### Instalación

Desde la raíz del repositorio:

```bash
npm install   # instala las dependencias de frontend y backend
```

### Backend

```bash
cd backend
cp .env.example .env   # completar DATABASE_URL y JWT_SECRET

# si no tenés PostgreSQL corriendo, se puede levantar uno local con Docker:
docker run -d --name pasantias-postgres \
  -e POSTGRES_USER=pasantias -e POSTGRES_PASSWORD=pasantias -e POSTGRES_DB=pasantias \
  -p 5434:5432 postgres:16-alpine

npx prisma migrate dev
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env   # completar variables de entorno
npm run dev
```

### Desde la raíz (alternativa)

```bash
npm run dev:backend
npm run dev:frontend
```

La API estará disponible en `http://localhost:3000/api`, su documentación interactiva (Swagger) en `http://localhost:3000/api/docs` y el cliente en `http://localhost:5173`.

---

## 🗺️ Cronograma de entregas

| Entrega          | Descripción                                       | Fecha          |
| ---------------- | ------------------------------------------------- | -------------- |
| ✅ 1.ª Entrega   | Propuesta de proyecto y repositorio               | 30/08/2026     |
| 📤 2.ª Entrega   | Esquema de BD y listado de módulos                | 27/09/2026     |
| ⏳ Entrega Final | Repositorio completo, despliegue, informe y video | 14/11/2026     |
| 🎤 Defensa oral  | Presentación ante el comité                       | Mesa de examen |

---

## 📄 Licencia

Proyecto académico — Tecnicatura en Programación.

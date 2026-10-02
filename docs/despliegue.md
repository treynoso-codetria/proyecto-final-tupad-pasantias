# Despliegue — Portal de Pasantías

| Parte | Plataforma | Qué despliega | Configuración en el repo |
| --- | --- | --- | --- |
| Base de datos | [Neon](https://neon.tech) | PostgreSQL | — |
| Backend | [Render](https://render.com) | `backend/` (API NestJS) | [`render.yaml`](../render.yaml) |
| Frontend | [Vercel](https://vercel.com) | `frontend/` (SPA React) | [`frontend/vercel.json`](../frontend/vercel.json) |
| Emails | [Brevo](https://www.brevo.com) | Envío de emails de la cuenta (verificación, cambio de email) | — |

Las tres se usan en su plan gratuito. Render y Vercel despliegan solos en cada push a `main`.

El orden importa, porque cada paso necesita un dato del anterior: **Neon → Brevo → Render → Vercel → volver a Render**.

---

## 1. Base de datos en Neon

1. Crear un proyecto nuevo con PostgreSQL 16 en la región **AWS US East (N. Virginia)** — la misma que usa el backend en Render.
2. En *Connect*, copiar la cadena de conexión **directa**: desactivar la opción *Connection pooling*. El host no debe contener `-pooler`.

   ```
   postgresql://USUARIO:CLAVE@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

   Se usa la conexión directa porque `prisma migrate deploy` no funciona a través del pooler, y con el tráfico de este proyecto no hace falta pooling.

No hay que crear tablas a mano: las crea el primer despliegue del backend.

## 1 bis. Envío de emails con Brevo

El backend envía emails (verificación de cuenta, cambio de email, avisos) por la API HTTPS de Brevo. No se usa SMTP porque el plan gratuito de Render bloquea los puertos SMTP salientes.

1. Crear una cuenta gratuita en Brevo (300 emails por día).
2. En *Senders, Domains & Dedicated IPs → Senders*, agregar la dirección desde la que se envía y verificarla con el código que llega a esa casilla.
3. En *SMTP & API → API Keys*, generar una clave de API.

Esos dos datos son las variables `MAIL_FROM_EMAIL` y `BREVO_API_KEY` del backend. **En producción son obligatorias:** sin ellas el backend no arranca (Render conserva en línea la versión anterior).

Como el remitente es una dirección de Gmail y no un dominio propio, Brevo reemplaza el dominio visible por uno suyo (`…@NNNN.brevosend.com`); el nombre que ve el destinatario es `MAIL_FROM_NAME`.

## 2. Backend en Render

1. *New → Blueprint* y elegir este repositorio. Render lee `render.yaml` y propone el servicio `pasantias-api`.
2. Completar las dos variables que pide:

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | La cadena de conexión de Neon del paso 1. |
   | `CORS_ORIGIN` | Por ahora `http://localhost:5173`; se corrige en el paso 4. |
   | `BREVO_API_KEY` | La clave de API de Brevo (paso 1 bis). |
   | `MAIL_FROM_EMAIL` | La dirección verificada como remitente en Brevo. |

   `JWT_SECRET` se genera solo; `JWT_EXPIRES_IN`, `NODE_ENV`, `NODE_VERSION`, `FRONTEND_URL` y `MAIL_FROM_NAME` ya vienen definidas en `render.yaml`.

   > Render solo pregunta por estas variables al **crear** el servicio desde el Blueprint. En un servicio que ya existe hay que agregarlas a mano en *Environment*.
3. Esperar a que termine el despliegue y anotar la URL del servicio (`https://pasantias-api-xxxx.onrender.com`).

En cada despliegue Render ejecuta, desde la raíz del monorepo:

```bash
# Build: instala, genera el cliente de Prisma, compila y aplica migraciones pendientes
npm ci --include=dev --workspace=backend --include-workspace-root
npm run build --workspace=backend
npm run db:deploy --workspace=backend

# Start
npm run start:prod --workspace=backend
```

Si una migración falla, el build falla y sigue en línea la versión anterior.

<details>
<summary>Alternativa sin Blueprint (servicio creado a mano)</summary>

*New → Web Service*, con estos valores:

| Campo | Valor |
| --- | --- |
| Root Directory | *(vacío: raíz del repositorio)* |
| Runtime | Node |
| Region | Virginia |
| Build Command | `npm ci --include=dev --workspace=backend --include-workspace-root && npm run build --workspace=backend && npm run db:deploy --workspace=backend` |
| Start Command | `npm run start:prod --workspace=backend` |
| Health Check Path | `/api` |
| Variables | `NODE_VERSION=24`, `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (mínimo 32 caracteres), `JWT_EXPIRES_IN=1d`, `CORS_ORIGIN`, `FRONTEND_URL` (URL de Vercel), `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` |

</details>

## 3. Frontend en Vercel

1. *Add New → Project* e importar este repositorio.
2. Configurar:

   | Campo | Valor |
   | --- | --- |
   | Root Directory | `frontend` |
   | Framework Preset | Vite *(se detecta solo)* |
   | Build Command / Output Directory | *(valores por defecto: `npm run build` / `dist`)* |
   | Variable `VITE_API_URL` | La URL de Render del paso 2, **sin** `/api` al final. |

3. Desplegar y anotar la URL de producción (`https://xxxx.vercel.app`).

`VITE_API_URL` se incorpora al compilar: si cambia, hay que volver a desplegar el frontend.

## 4. Conectar el backend con el frontend

En Render, *Environment* del servicio: cambiar `CORS_ORIGIN` por la URL de Vercel del paso 3 y guardar. Render vuelve a desplegar solo.

Para permitir más de un origen (por ejemplo, también el entorno local), separarlos con comas:

```
CORS_ORIGIN=https://xxxx.vercel.app,http://localhost:5173
```

## 5. Datos iniciales (una sola vez)

La base queda vacía: sin administrador y sin categorías. El administrador solo se crea por script, no por registro. Cargar `database/seed.sql` contra Neon, desde la raíz del repositorio:

```bash
# Con psql instalado
psql "CADENA_DE_NEON" -v ON_ERROR_STOP=1 -f database/seed.sql

# Sin psql, usando el contenedor local de Postgres
docker exec -i pasantias-postgres psql "CADENA_DE_NEON" -v ON_ERROR_STOP=1 < database/seed.sql
```

El seed solo se puede cargar una vez: usa identificadores y emails fijos, así que una segunda carga falla y no modifica nada.

> **Importante:** el seed crea las cuentas de prueba con la contraseña pública `Password123!`, incluida la del administrador. Antes de compartir la URL, cambiar al menos la del administrador:
>
> ```sql
> UPDATE users
> SET password_hash = crypt('UNA_CLAVE_NUEVA', gen_salt('bf', 10))
> WHERE email = 'admin@pasantias.dev';
> ```

## 6. Verificación

| Prueba | Resultado esperado |
| --- | --- |
| Abrir `https://…onrender.com/api` | `Hello World!` |
| Abrir `https://…onrender.com/api/docs` | Documentación Swagger |
| Abrir la URL de Vercel | Pantalla de login |
| Iniciar sesión con una cuenta del seed | Home del rol correspondiente |
| Recargar la página estando en `/student` | Sigue en `/student` (no da 404) |
| Registrar una cuenta nueva con un email real | Muestra "revisá tu correo" y llega el email de verificación |
| Abrir el enlace del email | Entra a la home del rol; la cuenta aparece en Neon con `email_verified_at` |

Si el login falla con un error de red y en la consola del navegador aparece un error de CORS, revisar que `CORS_ORIGIN` coincida exactamente con la URL de Vercel (paso 4).

---

## A tener en cuenta en el plan gratuito

- **Arranque en frío del backend:** Render duerme el servicio tras unos 15 minutos sin uso; la primera request posterior tarda cerca de un minuto. Antes de una demostración conviene abrir `/api` unos minutos antes.
- **Suspensión de la base:** Neon suspende la base cuando no se usa y la reactiva sola con la primera consulta (uno o dos segundos).
- **Despliegues de vista previa de Vercel:** cada rama o pull request obtiene una URL distinta, que no está en `CORS_ORIGIN`; desde esas URL el frontend carga pero no puede llamar a la API.
- **Redespliegue selectivo del backend:** Render solo redespliega cuando cambian `backend/`, `package.json`, `package-lock.json` o `render.yaml`.
- **Versión de Node:** fijada en 24 (`engines` de `package.json` y `NODE_VERSION` en Render).

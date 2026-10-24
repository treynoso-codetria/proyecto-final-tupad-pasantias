# Despliegue — Portal de Pasantías

Producción corre en un servidor virtual propio (un *droplet* de DigitalOcean) con Docker. Frontend, API y base de datos están en el mismo servidor; los emails y los archivos usan servicios externos.

| Parte | Dónde | Configuración en el repo |
| --- | --- | --- |
| Frontend (SPA React) | Archivos estáticos servidos por **Caddy** en el servidor | [`Dockerfile`](../Dockerfile) (etapa `web`), [`deploy/site.caddy`](../deploy/site.caddy) |
| Backend (API NestJS) | Contenedor Docker `pasantias-api` en el servidor | [`Dockerfile`](../Dockerfile) (etapa `api`), [`deploy/compose.yml`](../deploy/compose.yml) |
| Base de datos | **PostgreSQL 18** en un contenedor del servidor, compartido con otros proyectos (una base y un usuario por proyecto) | — |
| Emails | [Brevo](https://www.brevo.com) (API HTTPS) | — |
| Archivos (CV y logos) | [Backblaze B2](https://www.backblaze.com/cloud-storage), bucket privado | — |

URL de producción: <https://pasantias.165-227-8-179.sslip.io> (API en `/api`, Swagger en `/api/docs`). Hasta tener un dominio propio se usa [sslip.io](https://sslip.io), que resuelve ese nombre a la IP del servidor; Caddy obtiene el certificado HTTPS de Let's Encrypt solo.

```mermaid
flowchart LR
    B["Navegador"] -- "HTTPS" --> C["Caddy<br/>:443"]
    subgraph Servidor["Droplet (Docker)"]
        C -- "/*<br/>(SPA estática)" --> W[["deploy/www"]]
        C -- "/api/*" --> A["pasantias-api<br/>NestJS :3000"]
        A -- "red db" --> P[("PostgreSQL<br/>base pasantias")]
    end
    A -- "API S3" --> B2[["Backblaze B2"]]
    A -- "API HTTPS" --> BR["Brevo"]
```

Frontend y API comparten el mismo origen: la SPA llama a `https://<host>/api`, así que no hay pedidos entre dominios distintos y `CORS_ORIGIN`, `FRONTEND_URL`, `PUBLIC_API_URL` y `VITE_API_URL` valen lo mismo.

---

## Cómo funciona un despliegue

En el servidor, el repositorio está clonado en `~/apps/pasantias`. Un despliegue es un solo comando:

```bash
ssh <servidor> '~/apps/pasantias/deploy/deploy.sh'        # rama main
ssh <servidor> '~/apps/pasantias/deploy/deploy.sh otra'   # otra rama
```

[`deploy/deploy.sh`](../deploy/deploy.sh):

1. Actualiza el clon a la última versión de la rama en GitHub.
2. Compila las imágenes de la API y de las migraciones ([`Dockerfile`](../Dockerfile), etapas `api` y `backend-build`).
3. Compila el frontend (etapa `web`) con `VITE_API_URL` tomada de `PUBLIC_API_URL` de `deploy/.env`, y exporta los archivos estáticos.
4. Aplica las migraciones pendientes (`prisma migrate deploy`, servicio `migrate`). **Si una migración falla, el despliegue se corta** y sigue en línea la versión anterior.
5. Reinicia la API y espera a que su *healthcheck* (`GET /api`) responda.
6. Publica el frontend nuevo en `deploy/www` y recarga Caddy (por si cambió `deploy/site.caddy`).

Tarda unos 3–4 minutos, casi todo en `npm ci` y el build de NestJS. La API solo deja de responder los segundos del reinicio.

Por qué así:

- **Se compila en el servidor** y no en un servicio de CI: para un proyecto de este tamaño alcanzan los 2 GB de RAM (más swap) y no hace falta un registro de imágenes.
- **La imagen de la API no incluye dependencias de desarrollo** (`npm ci --omit=dev`); el CLI de Prisma solo está en la imagen de migraciones, que se ejecuta y termina.
- **El frontend no necesita un proceso propio**: son archivos estáticos que sirve Caddy, con caché permanente para `/assets` (llevan un *hash* en el nombre) y `try_files` hacia `index.html` para que recargar una ruta de la SPA no dé 404.

---

## Preparar un servidor nuevo

Lo necesario una sola vez. Se asume Ubuntu 24.04 con Docker y Docker Compose instalados, y un firewall que solo deje pasar los puertos 22, 80 y 443.

### 1. Infraestructura compartida (Caddy + PostgreSQL)

El proyecto se suma a una infraestructura que el servidor comparte con otros proyectos: un contenedor `caddy` y un contenedor `postgres`, conectados a dos redes de Docker con nombre fijo, `web` y `db`. [`deploy/compose.yml`](../deploy/compose.yml) se une a esas redes. Lo mínimo que tiene que tener esa infraestructura:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy          # deploy.sh lo recarga por este nombre
    ports: ["80:80", "443:443", "443:443/udp"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ~/apps:/srv/apps:ro         # clones de los proyectos
      - caddy_data:/data
    networks: [web]
  postgres:
    image: postgres:18-alpine
    container_name: postgres       # host de DATABASE_URL
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql
    networks: [db]
networks:
  web: { name: web }
  db: { name: db }
volumes:
  caddy_data:
  pgdata:
```

Y en su `Caddyfile`, una línea que importa la configuración de sitio de cada proyecto:

```
import /srv/apps/*/deploy/site.caddy
```

### 2. Base de datos y usuario

```bash
docker exec -i postgres psql -U postgres <<'SQL'
CREATE USER pasantias WITH PASSWORD 'UNA_CLAVE_LARGA';
CREATE DATABASE pasantias OWNER pasantias;
REVOKE ALL ON DATABASE pasantias FROM PUBLIC;
SQL
```

La base no se expone a internet: la API la alcanza por la red `db` con el host `postgres`.

### 3. Servicios externos

**Brevo (emails).** El backend envía la verificación de cuenta, el cambio de email y los avisos por la API HTTPS de Brevo.

1. Crear una cuenta gratuita (300 emails por día).
2. En *Senders, Domains & Dedicated IPs → Senders*, agregar la dirección remitente y verificarla.
3. En *SMTP & API → API Keys*, generar una clave.

Como el remitente es una dirección de Gmail y no un dominio propio, Brevo reemplaza el dominio visible por uno suyo (`…@NNNN.brevosend.com`); el nombre que ve el destinatario es `MAIL_FROM_NAME`.

**Backblaze B2 (archivos).** Los CV y los logos se guardan en un bucket **privado**; el backend los sube por la API compatible con S3 y los entrega con enlaces firmados que vencen, así que un CV solo lo abre quien recibió el enlace de la API.

1. En *B2 Cloud Storage → Buckets → Create a Bucket*: nombre único, **Files in Bucket: Private**. En el detalle queda su **Endpoint** (`s3.us-east-005.backblazeb2.com`).
2. *Application Keys → Add a New Application Key*: solo ese bucket, *Read and Write*. Copiar `keyID` y `applicationKey` (se muestra una sola vez).

El bucket no necesita reglas de CORS: el navegador solo abre los enlaces, no los pide con `fetch`.

### 4. Clonar y configurar

```bash
git clone https://github.com/treynoso-codetria/proyecto-final-tupad-pasantias.git ~/apps/pasantias
cd ~/apps/pasantias/deploy
cp .env.example .env && chmod 600 .env
nano .env
```

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | `postgresql://pasantias:CLAVE@postgres:5432/pasantias?schema=public` (clave del paso 2). |
| `JWT_SECRET` | Al menos 32 caracteres: `openssl rand -base64 33`. |
| `PUBLIC_API_URL`, `FRONTEND_URL`, `CORS_ORIGIN` | La URL pública del sitio, sin `/` final (el mismo nombre que en [`deploy/site.caddy`](../deploy/site.caddy)). |
| `BREVO_API_KEY`, `MAIL_FROM_EMAIL` | Del paso 3. |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Del paso 3. |
| `S3_ENDPOINT`, `S3_REGION` | `https://` + el endpoint del bucket, y la parte entre `s3.` y `.backblazeb2.com` (por ejemplo `us-east-005`). |

`deploy/.env` nunca se versiona (está en `.gitignore`). **En producción las variables de Brevo, B2 y `PUBLIC_API_URL` son obligatorias:** sin ellas la API no arranca, el *healthcheck* falla y `deploy.sh` termina con error.

### 5. Primer despliegue y datos iniciales

```bash
~/apps/pasantias/deploy/deploy.sh
```

Las migraciones crean las tablas, pero la base queda sin administrador y sin categorías (el administrador solo se crea por script). Cargar el seed una vez:

```bash
docker exec -i postgres psql -U pasantias -d pasantias -v ON_ERROR_STOP=1 < ~/apps/pasantias/database/seed.sql
```

El seed usa identificadores y emails fijos, así que una segunda carga falla sin modificar nada.

> **Importante:** el seed crea las cuentas de prueba con la contraseña pública `Password123!`, incluida la del administrador. Antes de compartir la URL, cambiar al menos la del administrador:
>
> ```sql
> UPDATE users
> SET password_hash = crypt('UNA_CLAVE_NUEVA', gen_salt('bf', 10))
> WHERE email = 'admin@pasantias.dev';
> ```

---

## Verificación

| Prueba | Resultado esperado |
| --- | --- |
| Abrir `https://<host>/api` | `Hello World!` |
| Abrir `https://<host>/api/docs` | Documentación Swagger |
| Abrir `https://<host>` | Pantalla de inicio |
| Iniciar sesión con una cuenta del seed | Home del rol correspondiente |
| Recargar la página estando en `/student` | Sigue en `/student` (no da 404) |
| Registrar una cuenta nueva con un email real | Muestra "revisá tu correo" y llega el email de verificación |
| Abrir el enlace del email | Entra a la home del rol |
| Subir un CV desde "Mi perfil" y abrirlo | Se abre el PDF; en B2 aparece en `cvs/<id del perfil>/` |
| Subir un logo desde "Perfil de la empresa" | Se ve en el perfil, en las ofertas y en la página pública de la empresa |

---

## Operación

```bash
cd ~/apps/pasantias/deploy
docker compose ps                    # estado y healthcheck de la API
docker compose logs -f api           # logs de la API
docker compose restart api           # reiniciar sin recompilar
docker exec -it postgres psql -U pasantias -d pasantias   # consola SQL
```

- **Backups:** el servidor hace un `pg_dump` diario de todas las bases y conserva los últimos 7 días. Para restaurar uno: `docker exec -i postgres pg_restore -U postgres -d pasantias --clean --if-exists --no-owner < pasantias_FECHA.dump`.
- **Cambiar de dominio:** cambiar el nombre en `deploy/site.caddy` (commit), las tres URLs de `deploy/.env` y volver a desplegar. Caddy pide el certificado nuevo solo; los enlaces de emails ya enviados siguen apuntando al dominio anterior.
- **Variables de entorno:** después de editar `deploy/.env` alcanza con `docker compose up -d api`, salvo `PUBLIC_API_URL`, que también queda compilada en el frontend: ahí hay que volver a desplegar.
- **Memoria:** la API está limitada a 640 MB (`mem_limit`) y el *heap* de Node a 384 MB; en reposo usa unos 140 MB.
- **Versión de Node:** fijada en 24 (`engines` de `package.json` e imagen `node:24-slim`).

---

## Historial

Hasta el 23/10/2026 producción usaba servicios en plan gratuito: frontend en Vercel, API en Render y base en Neon (PostgreSQL *serverless*). Se migró a un servidor propio para evitar el arranque en frío de Render (cerca de un minuto tras 15 minutos sin uso) y la suspensión de la base de Neon. Los datos se copiaron de Neon con `pg_dump`/`pg_restore`, incluida la tabla `_prisma_migrations`, así que el historial de migraciones se conservó. Brevo y Backblaze B2 se siguen usando igual.

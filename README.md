# Programa Ministerial — Cimientos del proyecto

Sitio para gestionar personal de una congregación y generar de forma
semi-automatizada el programa semanal (basado en la plantilla "Vida y
Ministerio Cristianos"), editable antes de exportarlo a PDF.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express + Sequelize (ORM)
- **Base de datos:** MySQL

## Modelo de roles

- **admin**: crea/activa/desactiva cuentas de usuarios (congregaciones). No gestiona personal ni programas directamente.
- **usuario**: gestiona su propio personal y genera/edita/finaliza sus propios programas. Todo está aislado por `user_id` (multi-tenant simple).

## Modelo de datos (resumen)

```
users            (cuentas: admin / usuario)
  └─< personas    (personal de cada usuario, con "habilitaciones" = qué partes puede hacer)
  └─< programas   (una fila por semana)
        └─< partes_programa  (cada "casilla" del programa: título, sala, persona asignada)
tipos_parte       (catálogo global: Presidente, Tesoros, Discurso, etc. — ya viene sembrado)
```

La tabla `partes_programa` es deliberadamente flexible (tipo *EAV*) para
poder representar cualquier casilla de la plantilla (Sala Principal /
Auxiliar, titular / ayudante, etc.) sin tener que rediseñar el esquema cada
vez que cambie la estructura de la reunión.

Ver el detalle completo y comentado en `server/database/schema.sql`.

## Cómo funciona la generación semi-automática

`server/src/services/programGenerator.service.js` contiene la lógica clave:

1. Para cada `tipo_parte` (en el orden de la plantilla), busca en `personas`
   quién está activo, cumple el género requerido (si aplica) y tiene ese
   código dentro de sus `habilitaciones`.
2. Prioriza a quien lleva más tiempo sin ser asignado (`ultima_asignacion`
   más antigua o nula) → rotación equitativa automática.
3. Evita repetir a la misma persona dos veces en la misma semana.
4. Guarda todo como `programa` en estado `borrador`.
5. El usuario edita libremente cualquier campo desde el frontend
   (`ProgramEditor.jsx`) antes de exportar.
6. Al presionar **Finalizar**, recién ahí se actualiza `ultima_asignacion`
   de cada persona — así los borradores descartados no distorsionan la
   rotación.

## Cómo levantar el proyecto

### 1. Base de datos

```bash
mysql -u root -p < server/database/schema.sql
```

### 2. Backend

```bash
cd server
cp .env.example .env      # y edita tus credenciales de MySQL
npm install
npm run seed               # crea el primer usuario admin (usa ADMIN_EMAIL/ADMIN_PASSWORD del .env)
npm run dev                 # http://localhost:4000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:5173 (con proxy a /api → :4000)
```

Inicia sesión con las credenciales `ADMIN_EMAIL` / `ADMIN_PASSWORD` que
pusiste en `server/.env`. Desde "Usuarios (admin)" crea cuentas para cada
congregación/usuario real.

## Cómo pasar a producción (Netlify + Render + Aiven, todo gratis)

Sigue este orden — cada pieza depende de la anterior.

### Paso 0: sube el proyecto a GitHub

Render y Netlify se conectan directamente a un repositorio de Git. Crea un
repo (puede ser privado) y sube todo este proyecto (`client/` y `server/`
juntos está bien, cada plataforma solo mirará su carpeta correspondiente).

### Paso 1: base de datos en Aiven

1. Crea una cuenta gratis en [aiven.io](https://aiven.io) (no pide tarjeta).
2. Crea un servicio **MySQL** en el plan gratuito.
3. Cuando esté listo (unos minutos), copia sus datos de conexión: host,
   puerto, usuario, contraseña y nombre de base de datos.
4. Conéctate con esos datos (por ejemplo con MySQL Workbench, TablePlus, o
   `mysql` por consola) y ejecuta tu `server/database/schema.sql` para crear
   las tablas.
5. Aiven a veces "apaga" el servicio gratuito tras inactividad — si tu app
   deja de responder tras varios días sin uso, entra al panel de Aiven y
   enciéndelo de nuevo.

### Paso 2: backend en Render

1. Crea una cuenta gratis en [render.com](https://render.com) y conéctala a tu GitHub.
2. "New Web Service" → elige tu repo → cuando te pregunte la carpeta raíz,
   pon `server` (o deja que Render lea `render.yaml`, que ya está preparado).
3. Build command: `npm install` — Start command: `npm start`.
4. En "Environment", agrega las variables de `server/.env.example` con los
   valores reales de Aiven (y `DB_SSL=true`). `JWT_SECRET` puedes generarlo
   con Render automáticamente. Deja `CLIENT_URL` vacío por ahora, lo llenas
   en el paso 4.
5. Antes de tener el frontend, corre `npm run seed` una vez (Render tiene
   una consola/"Shell" para tu servicio) para crear tu usuario admin.
6. Al desplegar, Render te da una URL pública tipo
   `https://programa-ministerio-api.onrender.com`. Pruébala visitando
   `/api/health` — debe responder `{"status":"ok"}`.
7. Recuerda: en el plan gratuito, el servicio se "duerme" tras 15 min sin
   tráfico. La primera visita después de eso tarda ~30 segundos en responder.

### Paso 3: frontend en Netlify

1. Crea una cuenta gratis en [netlify.com](https://netlify.com) y conéctala a tu GitHub.
2. "Add new site" → tu repo. Netlify debería detectar automáticamente la
   configuración de `netlify.toml` (carpeta `client`, comando `npm run build`,
   carpeta de salida `dist`).
3. En "Environment variables", agrega `VITE_API_URL` con la URL de tu backend
   de Render + `/api`, ej: `https://programa-ministerio-api.onrender.com/api`.
4. Despliega. Netlify te da una URL tipo `https://tu-sitio.netlify.app`.

### Paso 4: cerrar el círculo (CORS)

Vuelve a Render → variables de entorno de tu backend → pon `CLIENT_URL` con
la URL que te dio Netlify (sin barra final) → guarda (esto redepliega el
servicio). A partir de aquí, solo tu frontend puede hacer peticiones a tu API.

### Verificación final

- Entra a tu URL de Netlify, inicia sesión con el admin que creaste en el
  paso 2.6.
- Prueba crear un usuario, una persona, y generar un programa.
- Si algo falla, revisa primero la consola del navegador (errores de CORS o
  de red) y luego los "Logs" de tu servicio en Render.



1. **Exportación a PDF** (`server/src/services/pdf.service.js` — no
   incluido aún). Sugerencia: usar `puppeteer` para renderizar una
   plantilla HTML/CSS que imite el diseño de tu PDF de referencia, y
   convertirla a PDF. Ya está declarada la dependencia en `package.json`
   y la ruta `GET /api/programas/:id/pdf` como stub (devuelve 501).
2. **Validaciones más finas** en el generador: por ejemplo, evitar que la
   misma persona repita una parte con menos de N semanas de diferencia,
   o reglas específicas de "Sala Principal" vs "Sala Auxiliar".
3. **Refinar el diseño visual** — la interfaz actual usa Tailwind con un
   estilo limpio y neutro a propósito, como base para que definas la
   identidad visual final (colores, tipografía, logo de la congregación).
4. **Migraciones** con Sequelize CLI en vez de `schema.sql` a mano, si el
   proyecto crece.
5. **Historial de asignaciones por persona** (pantalla que muestre cuándo
   fue la última vez que cada quien participó), muy útil para que el
   usuario confíe en la rotación automática.

## Estructura de carpetas

```
server/
  src/
    config/        conexión a MySQL (Sequelize)
    models/         User, Persona, TipoParte, Programa, PartePrograma
    controllers/    lógica de cada endpoint
    routes/         definición de rutas Express
    middleware/     auth (JWT) y manejo de errores
    services/       generador de programas (rotación) + pdf (pendiente)
  database/
    schema.sql      DDL + semilla del catálogo de tipos_parte
    seed.js         crea el primer usuario admin

client/
  src/
    api/            instancia de axios con JWT automático
    context/         AuthContext (login/logout/sesión)
    routes/          ProtectedRoute
    components/Layout/  Sidebar, Navbar, AppLayout
    pages/           Login, Dashboard, Personal, Programas, Admin
```

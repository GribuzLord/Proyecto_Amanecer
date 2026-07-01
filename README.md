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

## Qué falta por construir (siguientes pasos sugeridos)

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

# 🎮 Soporte Movistar — Sala de Eventos

Página web estática del clan **Soporte Movistar** de PokeMMO.

Una **sala de eventos** que centraliza los torneos, capturas, concursos y actividades de la comunidad: próximos eventos, ranking, miembros, historial, anuncios y galería.

> Proyecto de fans. No está afiliado a Pokémon, PokeMMO, Nintendo, Game Freak ni ninguna otra compañía.

---

## ✨ Funcionalidades

- 🔐 **Acceso por usuario**: al entrar se pide el nombre de usuario del juego. Según su rango en la base, el usuario es:
  - 🎓 **Staff** → puede **organizar eventos** (crearlos y ver inscripciones).
  - 🧑‍🤝‍🧑 **Resto** → puede ver todo y **registrarse** a los eventos.
- 📅 **Eventos** con tarjetas, estados (próximo, en curso, finalizado, cancelado), detalles en modal con reglas, premios, participantes y resultados.
- 📝 **Inscripciones a eventos** con un clic (y posibilidad de cancelarlas).
- 🔍 **Filtros por estado y tipo** + buscador (sin recargar la página).
- ⏱️ **Cuenta regresiva automática** al próximo evento en la portada.
- 🏆 **Ranking** del clan ordenado automáticamente por puntos (🥇 🥈 🥉).
- 👥 **Miembros** con tarjetas y resumen de estadísticas.
- 📜 **Historial** de eventos finalizados con filtros y buscador.
- 📢 **Anuncios** en la portada.
- 📸 **Galería**: al finalizar un evento, el staff puede agregar fotos. Cada evento publicado aparece como una colección en el inicio y, al hacer clic, se muestran todas sus fotos.
- 🌙 **Modo claro / oscuro** con preferencia guardada en `localStorage`.
- 📱 **Diseño responsive** (PC, tablet y móvil) con menú hamburguesa.
- 🎨 Estética inspirada en PokeMMO: tarjetas, sombras, gradientes y animaciones ligeras.

---

## 🛠️ Tecnologías

- **HTML5**
- **CSS3** (variables para temas claro/oscuro)
- **JavaScript vanilla**
- **JSON** para los datos
- **[Recomendado]** API Node.js (v18+) + **PostgreSQL** (`api/`) para sincronización centralizada

El sitio funciona **sin servidor** en **GitHub Pages** (modo offline con `localStorage`). Si además levantas la **API**, los eventos, inscripciones y fotos se centralizan y se sincronizan para todo el clan en tiempo real, guardados en una base **PostgreSQL** (Supabase).

---

## 📂 Estructura del proyecto

```
Soporte-Movistar-Eventos/
│
├── index.html          → Portada (hero, próximo evento + cuenta regresiva)
├── eventos.html        → Todos los eventos con filtros y buscador
├── ranking.html        → Tabla de posiciones
├── miembros.html       → Tarjetas de miembros
├── historial.html      → Eventos finalizados
│
├── css/
│   ├── style.css       → Estilos principales (temas claro/oscuro)
│   └── responsive.css  → Estilos responsive
│
├── js/
│   ├── config.js       → 🔧 URL de la API (editar aquí en producción)
│   ├── main.js         → Navegación, tema, utilidades, modal, portada
│   ├── api.js          → Cliente de la API centralizada (opcional)
│   ├── eventos.js      → Lógica de la página de eventos
│   ├── ranking.js      → Lógica del ranking
│   ├── miembros.js     → Lógica de miembros
│   └── historial.js    → Lógica del historial
│
├── api/                → Backend (Node.js + PostgreSQL/Supabase, `npm install`)
│   ├── server.js       → Servidor HTTP con las rutas de la API
│   ├── db.js           → Capa de base de datos (tablas, seed de usuarios)
│   └── package.json    → Dependencias (`pg`) + script `npm start`
│
├── render.yaml         → Blueprint de Render para desplegar la API con un clic
│
├── data/
│   ├── eventos.json    → Los eventos del clan
│   ├── miembros.json   → Los miembros del clan
│   ├── ranking.json    → Las posiciones del ranking
│   └── usuarios.json   → Base de usuarios para el acceso (nombre + rango)
│
├── assets/
│   ├── logo/           → El logo del clan (logo.png)
│   ├── eventos/        → Imágenes de los eventos
│   ├── pokemon/        → Imágenes/sprites de pokémon
│   └── icons/          → Iconos de la web
│
└── README.md
```

---

## 🔐 Acceso por usuario, roles e inscripciones

Al abrir el sitio aparece una pantalla de **inicio de sesión**. El usuario escribe el nombre que usa en el juego y el sistema lo busca en `data/usuarios.json`.

### 📖 `data/usuarios.json` (base de usuarios)

```json
[
  { "nombre": "JugadorEjemplo", "rango": "staff" },
  { "nombre": "EntrenadorDemo", "rango": "co-lider" },
  { "nombre": "Player01", "rango": "miembro" },
  { "nombre": "Player04", "rango": "recluta" }
]
```

- El campo **`nombre`** debe coincidir con el nombre del jugador en el juego.
- El campo **`rango`** puede ser: `Jefazo`, `Staff`, `Veterano`, `Esclavo`, `Mascota` o `Jugador`.
- **`rango` = `Staff`** → es **editor**: puede crear eventos, copiar listas de participantes y eliminar eventos locales.
- **`rango` = `Jefazo`** (Pixeleado, creador del clan) → también es **editor/administrador**.
- Cualquier otro rango → es **lector**: ve todo y puede registrarse a los eventos.

> 💡 La base real del clan ya está integrada en `data/usuarios.json` (18 jugadores). Puedes editarla cuando cambien roles o entren nuevos jugadores. Si un nombre no está en la base, el acceso se rechaza.

### 🧾 ¿Qué se guarda y dónde?

El sitio es **100 % estático** (no hay servidor), así que las inscripciones y los eventos creados por staff se guardan en el **`localStorage` del navegador** de cada usuario:

| Dato | Clave en `localStorage` | Quién lo usa |
|------|------------------------|--------------|
| Sesión (usuario + rango) | `sm-usuario` | Todos |
| Inscripciones a eventos | `sm-inscripciones` | Todos |
| Eventos creados por staff | `sm-eventos-staff` | Solo staff |
| Anuncios generados por eventos | `sm-anuncios` | Todos (lee) |
| Fotos de la galería | `sm-galeria` | Solo staff (escribe) |
| Tema claro/oscuro | `sm-tema` | Todos |

Esto significa que:

- Un jugador se registra **desde su propio navegador** y su inscripción queda guardada ahí.
- **Sin la API**, no hay servidor central y no se sincroniza entre navegadores.
- Para publicar un evento creado por staff para todo el clan, el staff debe **copiar el JSON** del evento (botón en el modal) y pegarlo en `data/eventos.json`, como se explica más abajo.
- **Con la API** (recomendado), todo esto se centraliza automáticamente (ver sección [⚙️ La API centralizada](#️-la-api-centralizada)).

> ⚠️ Si el líder quiere tener una lista **oficial** de participantes, ve el detalle del evento con su cuenta y usa el botón **"📋 Copiar lista de participantes"** para pegarla en el chat del clan.

### 🧩 Los eventos "LOCAL"

Los eventos creados por staff (botón ➕) llevan la etiqueta **LOCAL** y aparecen en todos los filtros, ordenados con los demás. Solo existen en el navegador donde se crearon:
- Se guardan en `sm-eventos-staff` y se mezclan con los del archivo en tiempo real.
- El staff puede **eliminarlos** desde su modal de detalle.
- Para que el resto del clan los vea de forma permanente, hay que copiar su JSON a `data/eventos.json`.

---

## ⚙️ La API centralizada (recomendada)

Para que los **eventos**, las **inscripciones** y la **galería de fotos** se sincronicen para **todo el clan** (sin que el staff tenga que copiar JSON a mano), el proyecto incluye una pequeña API backend, desplegada gratis en Render.com:

- **`api/`** → servidor en **Node.js** (HTTP puro + cliente PostgreSQL `pg`).
- Los datos se guardan en **PostgreSQL** mediante **Supabase** (capa gratuita: 500 MB de base), así que **no se pierden al reiniciar el servidor** (a diferencia del disco efímero de Render).
- Los usuarios del clan se **siembran** solos desde `data/usuarios.json` al arrancar (idempotente).
- El sitio sigue funcionando **sin** la API (modo offline con `localStorage`); cuando detecta que la API responde, la usa automáticamente.
- La API valida permisos de staff y la **ventana temporal de inscripción** (cerrada hasta el inicio / abierta mientras dure).

### 📌 Endpoints

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/api/health` | Comprueba que la API está viva. |
| `POST` | `/api/auth` | Valida un nombre de usuario contra la base. |
| `GET` | `/api/eventos-staff` | Lista los eventos centralizados. |
| `POST` | `/api/eventos-staff` | Crea un evento (solo staff, header `X-Usuario`). |
| `DELETE` | `/api/eventos-staff/:id` | Elimina un evento y sus inscripciones/fotos (solo staff). |
| `GET` | `/api/eventos/:id/inscripciones` | Lista inscripciones + participantes de un evento. |
| `POST` | `/api/eventos/:id/inscripciones` | Inscribe a un usuario (respeta la ventana temporal). |
| `DELETE` | `/api/eventos/:id/inscripciones/:usuario` | Cancela una inscripción. |
| `GET` | `/api/eventos/:id/fotos` | Lista las fotos de la galería de un evento. |
| `POST` | `/api/eventos/:id/fotos` | Sube una foto (solo staff, `datos` en formato `data:image/...`). |

### 🖥️ Cómo ejecutar la API en local

Requisitos: **Node.js v18+** y una base PostgreSQL. Para desarrollo puedes usar tu **Supabase** (misma base que producción).

```bash
cd Soporte-Movistar-Eventos/api
npm install                # Instala la dependencia 'pg'
$env:DATABASE_URL = 'postgresql://postgres.PROYECTO:CONTRASENA@aws-0-...pooler.supabase.com:5432/postgres'
node server.js
```

Aparecerá: `✔ API Soporte Movistar escuchando en http://0.0.0.0:3000`. Al arrancar crea las tablas y siembra los usuarios del clan.

### 🔗 Conectando el sitio a la API

La URL de la API se configura en **un solo archivo**: `js/config.js`.

```js
// js/config.js
window.API_BASE_URL = 'https://soporte-movistar-api.onrender.com'; // URL de la API del clan
```

- En **local**, pon `http://localhost:3000`.
- En **producción**, deja la URL pública de Render (la actual es `https://soporte-movistar-api.onrender.com`).

> No hace falta tocar las 5 páginas HTML: todas leen `js/config.js`.

### 🚀 Cómo alojar la API gratis (Render.com + Supabase)

**1) Crea la base en Supabase (gratis):**
1. Crea una cuenta en [supabase.com](https://supabase.com) → **New project**.
2. Anota la **contraseña** de la base (no se vuelve a mostrar).
3. En el panel: botón **Connect → Session pooler** (puerto **5432**) y copia la connection string:
   ```
   postgresql://postgres.<proyecto>:<CONTRASENA>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
   (cambia `<CONTRASENA>` por la tuya). Es tu `DATABASE_URL`.

**2) Despliega en Render:**
- El proyecto incluye un **blueprint** (`render.yaml`). En [render.com](https://render.com) → **New → Blueprint** y conéctalo al repositorio.
- ✓ Importante: agrega la variable **`DATABASE_URL`** con tu connection string de Supabase (como **Secret** en *Environment* del servicio).

**Alternativa a mano (Web Service):**
- **Root Directory**: `api`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- En *Environment*, agrega la variable **`DATABASE_URL`** (Secret) con la connection string de Supabase.

> 💡 En Render, `PORT` se asigna automáticamente; la API ya la respeta (`process.env.PORT`).

> ⚠️ **No** subas tu `DATABASE_URL` en `render.yaml` ni en ningún archivo del repositorio: pásala como **variable de entorno (Secret)** en Render. La base SQLite local ya no se usa (los datos viven en Supabase y sobreviven a los reinicios de Render).

### 🔄 Qué cambia al activar la API

| Acción | Sin API (localStorage) | Con API (centralizado) |
| --- | --- | --- |
| Crear evento (staff) | Solo en tu navegador, con etiqueta LOCAL | Visible para **todo el clan** de inmediato |
| Inscripción | Solo en tu navegador | Aparece en el listado del evento para **todos** |
| Fotos de galería | Solo en tu navegador | Se comparten con **todo el clan** |
| Participantes | Copiado manual por staff | Lista actualizada en el servidor |

---

## 📝 Cómo modificar los datos

Todos los datos del sitio están en la carpeta `data/`. Solo tienes que editar esos archivos y subir los cambios; no hace falta tocar el HTML ni el JavaScript.

### ➕ Agregar / editar un evento → `data/eventos.json`

```json
{
  "id": 9,
  "nombre": "Nombre del evento",
  "tipo": "PvP",
  "tipoIcono": "⚔️",
  "fecha": "2026-10-01",
  "hora": "20:00",
  "estado": "proximo",
  "descripcion": "Una descripción corta del evento.",
  "ubicacion": "Ciudad Férrica",
  "organizador": "Soporte Movistar",
  "premio": "El premio del evento",
  "imagen": "assets/eventos/mi-evento.jpg",
  "reglas": ["Regla 1", "Regla 2"],
  "participantes": ["Jugador1", "Jugador2"],
  "ganador": null,
  "resultados": [],
  "observaciones": ""
}
```

**Campos clave:**

| Campo | Qué es |
| --- | --- |
| `id` | Número único del evento (no repetir). |
| `tipo` | Uno de: `PvP`, `PvE`, `Torneo`, `Captura`, `Concurso`, `Trivia`, `Búsqueda`, `Especial`. |
| `estado` | `proximo`, `en_curso`, `finalizado` o `cancelado`. |
| `fecha` | Formato `AAAA-MM-DD`. |
| `hora` | Formato `HH:MM`. |
| `tipoIcono` | Un emoji para identificar el tipo. |
| `ganador` | Nombre del ganador o `null`. |
| `resultados` | Lista de resultados (ej.: `"1º Jugador"`). |

> 📌 Consejo: cuando un evento termina, cambia `"estado": "proximo"` a `"finalizado"`, carga el `ganador` y los `resultados`. El evento aparece automáticamente en el **Historial**.

### 🔐 Agregar usuarios → `data/usuarios.json`

El formato es el que se muestra en la sección de **acceso por usuario**. Recuerda que el `nombre` debe coincidir con el nombre del jugador en el juego, y que `staff` es el único rango editor.

### 👥 Agregar / editar miembros → `data/miembros.json`

```json
{
  "id": 10,
  "nombre": "NuevoJugador",
  "rango": "Miembro",
  "icono": "🎮",
  "puntos": 40,
  "victorias": 0,
  "participaciones": 1,
  "especialidad": "PvP",
  "pokemon": "Absol"
}
```

**Rangos** sugeridos: `Líder`, `Co-líder`, `Miembro`, `Recluta`. Puedes usar los que quieras.

### 📸 Agregar fotos a la galería

- Entra al detalle de un evento **finalizado** como staff.
- Usa el botón **"📷 Agregar fotos a la galería"** y selecciona una o varias imágenes.
- Las fotos se guardan en el navegador (`localStorage`) y en el inicio aparece una colección por evento con su nombre.
- Al hacer clic en la colección se abren **todas las fotos** de ese evento.

### 🏆 Editar el ranking → `data/ranking.json`

```json
{
  "posicion": 1,
  "jugador": "ElJugador",
  "puntos": 500,
  "victorias": 8,
  "participaciones": 12
}
```

El ranking **se ordena solo por puntos**, así que no hace falta mantener el orden.

> ⚠️ Tipos: no importa que `posicion` no coincida con el orden real: la página lo recalcula.

### 🖼️ Agregar imágenes

1. Copia las imágenes dentro de `assets/` (recomendado `assets/eventos/`).
2. Escribe la ruta en el campo `imagen` del evento. Ejemplo:
   ```
   assets/eventos/torneo-pvp.jpg
   ```
3. Usa nombres sin espacios, en minúsculas y sin caracteres raros (por ejemplo `torneo-invierno.jpg`).

Si todavía no existe la imagen, la web muestra un **placeholder** automáticamente, así que no se rompe nada.

### 🔷 El logo

Coloca el logo del clan en:

```
assets/logo/logo.png
```

Mientras no exista, se muestra un círculo con el icono ⚡ como logo visual.

---

## ▶️ Cómo ejecutar localmente

Como la web carga los datos con `fetch`, lo recomendado es abrirla con un servidor local:

### Opción 1: VS Code + Live Server (más fácil)

1. Instala [VS Code](https://code.visualstudio.com/) y la extensión **Live Server**.
2. Abre la carpeta del proyecto en VS Code.
3. Haz clic derecho sobre `index.html` → **Open with Live Server**.

### Opción 2: Python

```bash
cd Soporte-Movistar-Eventos
python -m http.server 8080
```

Después abre `http://localhost:8080` en el navegador.

### Opción 3: Node

```bash
cd Soporte-Movistar-Eventos
npx serve
```

> 💡 También puedes abrir `index.html` con doble clic: la web usa datos de respaldo embebidos y verás todo funcionando, pero siempre es mejor usar un servidor local.

---

## 🚀 Cómo publicar en GitHub Pages

### Opción A: desde cero (nuevo repositorio)

1. Crea una cuenta en [GitHub](https://github.com) si no tienes.
2. Crea un **nuevo repositorio** (botón *New*). Puede ser público o privado.
3. Sube el contenido de la carpeta `Soporte-Movistar-Eventos/` (los archivos, no la carpeta en sí).

   Con Git en tu PC:
   ```bash
   git init
   git add .
   git commit -m "Sala de eventos Soporte Movistar"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/NOMBRE-DEL-REPO.git
   git push -u origin main
   ```

   O sube los archivos directamente desde la página web con **Uploading an existing file**.

4. En el repositorio, entra a **Settings → Pages**.
5. En **Source**, elige `Deploy from a branch` y la rama `main` en la carpeta `/ (root)`.
6. Guarda. En unos segundos la web estará publicada en:
   ```
   https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/
   ```

### Opción B: publicar dentro de otro proyecto

Si ya tienes un sitio en GitHub Pages y quieres que la sala viva en una subcarpeta (ej. `/eventos/`), publica el contenido en esa carpeta del repositorio. 

> 🔑 La web usa **rutas relativas** (`./css/style.css`, `./data/eventos.json`), por lo que funciona tanto en la raíz como en subcarpetas de GitHub Pages.

---

## 🧠 Preguntas frecuentes

**¿Puedo cambiar los colores?**
Sí. Los colores están definidos como variables al principio de `css/style.css` (sección `:root`). Cambia los valores de `--azul-primario`, `--amarillo`, etc.

**¿Dónde se editan los anuncios y la galería?**
Los anuncios de eventos se generan solos desde la portada al crear un evento. La galería se alimenta desde el modal de un evento finalizado (botón **"📷 Agregar fotos"**, solo staff).

**¿Puedo agregar un nuevo tipo de evento?**
Sí. Agrega el tipo al filtro en `js/eventos.js` (constante `FILTROS_TIPO`) y úsalo en `data/eventos.json`.

**¿Qué pasa si un JSON tiene un error?**
La web muestra un mensaje de error amigable en lugar de quedar en blanco.

---

## 🧩 Cuadro de referencia rápida de estados

| Estado en JSON | Cómo se muestra | Color |
| --- | --- | --- |
| `proximo` | PRÓXIMO | Azul |
| `en_curso` | EN CURSO (con animación) | Verde |
| `finalizado` | FINALIZADO | Gris |
| `cancelado` | CANCELADO | Rojo |

---

Hecho con 💙 para la comunidad **Soporte Movistar** (PokeMMO).
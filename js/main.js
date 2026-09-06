/* ============================================================
   SOPORTE MOVISTAR — SALA DE EVENTOS
   main.js
   Utilidades compartidas + login por rango + página de inicio
   ============================================================ */

'use strict';

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */

const PAGES = [
  { id: 'inicio', nombre: '🏠 Inicio', href: 'index.html' },
  { id: 'eventos', nombre: '📅 Eventos', href: 'eventos.html' },
  { id: 'ranking', nombre: '🏆 Ranking', href: 'ranking.html' },
  { id: 'miembros', nombre: '👥 Miembros', href: 'miembros.html' },
  { id: 'historial', nombre: '📜 Historial', href: 'historial.html' }
];

const RUTAS = {
  eventos: './data/eventos.json',
  ranking: './data/ranking.json',
  miembros: './data/miembros.json',
  usuarios: './data/usuarios.json'
};

const ESTADOS = {
  proximo:    'PRÓXIMO',
  en_curso:   'EN CURSO',
  finalizado: 'FINALIZADO',
  cancelado:  'CANCELADO'
};

/**
 * Rangos que pueden ORGANIZAR (editar/crear) eventos.
 * "staff" = staff del clan. "Jefazo" = creador del clan (admin).
 * Puedes agregar aquí otros rangos si quieres.
 */
const RANGOS_STAFF = ['staff', 'jefazo'];

/* Iconos por tipo de evento */
const TIPO_EMOJIS = {
  'PvP': '⚔️',
  'PvE': '🤝',
  'Torneo': '🥊',
  'Captura': '✨',
  'Concurso': '🎭',
  'Trivia': '❓',
  'Búsqueda': '🗺️',
  'Especial': '🎉'
};

/* Claves de localStorage */
const LS_TEMA = 'sm-tema';
const LS_SESION = 'sm-usuario';
const LS_INSCRIPCIONES = 'sm-inscripciones';
const LS_EVENTOS_STAFF = 'sm-eventos-staff';
const LS_ANUNCIOS = 'sm-anuncios';
const LS_GALERIA = 'sm-galeria';

/* ============================================================
   API CENTRALIZADA (opcional)
   Si la API está configurada y respondiendo, los eventos, las
   inscripciones y la galería se guardan de forma CENTRALIZADA en
   el servidor de la API (visible para todo el clan). Si no hay
   API disponible (p. ej. abriendo el sitio en GitHub Pages sin
   backend), el sitio degrada a localStorage y sigue funcionando.
   ============================================================ */

let apiDisponibleCache = null;

function apiActiva() {
  return typeof window.SM_API !== 'undefined' && window.SM_API !== null;
}

/* Detecta si la API responde (con timeout para no colgar). */
function apiEstaDisponible() {
  if (!apiActiva()) return Promise.resolve(false);
  if (apiDisponibleCache !== null) return Promise.resolve(apiDisponibleCache);
  if (typeof fetch !== 'function') return Promise.resolve(false);
  return fetch(window.SM_API.base + '/api/health', { method: 'GET' })
    .then(r => { apiDisponibleCache = r.ok; return r.ok; })
    .catch(() => { apiDisponibleCache = false; return false; });
}

/* Devuelve el id que le corresponde al evento ante la API.
   - Los eventos remotos (creados/publicados vía API) tienen id positivo.
   - Los eventos locales (solo navegador) tienen id negativo. */
function idApiDeEvento(evento) {
  if (evento && evento._api && evento.id) return evento.id;
  return null;
}

/* ============================================================
   UTILIDADES
   ============================================================ */

/**
 * Carga un archivo JSON mediante fetch.
 * Si el fetch falla (p. ej. abriendo el archivo directamente en el
 * navegador) devuelve los datos de respaldo embebidos.
 */
async function cargarJSON(ruta) {
  try {
    const respuesta = await fetch(ruta, { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return await respuesta.json();
  } catch (err) {
    console.warn(`No se pudo cargar ${ruta}`, err);
    if (DATOS_FALLBACK[ruta]) {
      console.warn('Usando datos de respaldo embebidos.');
      return DATOS_FALLBACK[ruta];
    }
    return null;
  }
}

/**
 * Escapa HTML para evitar inyección de texto.
 */
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto ?? '');
  return div.innerHTML;
}

/**
 * Formatea una fecha ISO a formato legible en español.
 */
function formatearFechaLarga(fechaISO) {
  if (!fechaISO) return 'Por definir';
  const fecha = new Date(fechaISO.length === 10 ? fechaISO + 'T00:00:00' : fechaISO);
  if (isNaN(fecha)) return fechaISO;
  return fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Formatea una fecha a formato corto DD/MM/AAAA.
 */
function formatearFechaCorta(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(fecha)) return iso;
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Devuelve la etiqueta de estado en mayúsculas.
 */
function etiquetaEstado(estado) {
  return ESTADOS[estado] || estado || '—';
}

/**
 * Devuelve true si el rango puede organizar eventos.
 */
function esStaff(rango) {
  return RANGOS_STAFF.includes(String(rango || '').trim().toLowerCase());
}

/**
 * Muestra un mensaje breve en pantalla (toast).
 */
function mostrarToast(mensaje) {
  const existente = document.querySelector('.toast');
  if (existente) existente.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = mensaje;
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-salida');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/**
 * Copia texto al portapapeles (con alternativa para navegadores viejos).
 */
function copiarAlPortapapeles(texto, mensaje) {
  const aviso = mensaje || '📋 Copiado al portapapeles';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto)
      .then(() => mostrarToast(aviso))
      .catch(() => copiarTextoFallback(texto, aviso));
  } else {
    copiarTextoFallback(texto, aviso);
  }
}

function copiarTextoFallback(texto, mensaje) {
  const field = document.createElement('textarea');
  field.value = texto;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    document.execCommand('copy');
    mostrarToast(mensaje);
  } catch (err) {
    mostrarToast('No se pudo copiar el texto');
  }
  field.remove();
}

/* ============================================================
   GESTIÓN DEL TEMA (claro / oscuro)
   ============================================================ */

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  const guardado = localStorage.getItem(LS_TEMA);
  if (guardado !== tema) {
    localStorage.setItem(LS_TEMA, tema);
  }
}

function inicializarTema() {
  const guardado = localStorage.getItem(LS_TEMA);
  if (guardado) {
    aplicarTema(guardado);
    return;
  }
  const sistema = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  aplicarTema(sistema);
}

function alternarTema() {
  const actual = document.documentElement.getAttribute('data-theme');
  aplicarTema(actual === 'dark' ? 'light' : 'dark');
}

/* ============================================================
   SESIÓN (login por nombre de usuario)
   ============================================================ */

function obtenerSesion() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESION)) || null;
  } catch (err) {
    return null;
  }
}

function guardarSesion(usuario) {
  localStorage.setItem(LS_SESION, JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.removeItem(LS_SESION);
  window.location.reload();
}

/**
 * Busca un usuario en la base (data/usuarios.json) sin distinguir mayúsculas.
 */
async function autenticarUsuario(nombre) {
  const usuarios = await cargarJSON(RUTAS.usuarios);
  if (!usuarios) return null;
  const buscado = String(nombre || '').trim().toLowerCase();
  const encontrado = usuarios.find(u => String(u.nombre || '').trim().toLowerCase() === buscado);
  if (!encontrado) return null;
  return {
    nombre: encontrado.nombre,
    rango: encontrado.rango || 'miembro',
    esStaff: esStaff(encontrado.rango)
  };
}

/* ---------- Pantalla de login ---------- */

function construirLoginGate() {
  const existe = document.getElementById('login-gate');
  if (existe) return;

  const gate = document.createElement('div');
  gate.className = 'login-gate';
  gate.id = 'login-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-label', 'Iniciar sesión');

  gate.innerHTML = `
    <div class="login-caja">
      <div class="login-logo" aria-hidden="true">⚡</div>
      <h1>SOPORTE MOVISTAR</h1>
      <span class="login-sub">Sala de Eventos</span>
      <p>Ingresá tu nombre de usuario del juego para entrar a la sala y participar en los eventos.</p>
      <form id="login-form">
        <label class="login-label" for="login-usuario">Nombre de usuario de PokeMMO</label>
        <input type="text" id="login-usuario" name="usuario" placeholder="Ej: Player01" autocomplete="username" maxlength="24" required>
        <button type="submit" class="btn btn-amarillo login-entrar">ENTRAR</button>
      </form>
      <p class="login-error" id="login-error" role="alert" hidden></p>
      <p class="login-nota">Solo miembros registrados del clan. Si tu nombre no funciona, pídele a un staff que te agregue.</p>
    </div>
  `;

  document.body.appendChild(gate);

  const form = document.getElementById('login-form');
  const campo = document.getElementById('login-usuario');
  const error = document.getElementById('login-error');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    error.hidden = true;
    const boton = form.querySelector('.login-entrar');
    boton.disabled = true;
    boton.textContent = 'VERIFICANDO...';

    const usuario = await autenticarUsuario(campo.value);

    if (!usuario) {
      error.textContent = '❌ El usuario no está registrado en el clan. Verificá tu nombre o pedí que un staff te agregue.';
      error.hidden = false;
      boton.disabled = false;
      boton.textContent = 'ENTRAR';
      campo.select();
      return;
    }

    guardarSesion(usuario);
    gate.classList.add('login-saliendo');
    setTimeout(() => gate.remove(), 350);

    aplicarSesion(usuario);
    mostrarToast(`¡Bienvenido, ${usuario.nombre}!`);
  });
}

/**
 * Actualiza la cabecera con el usuario conectado y las opciones según rango.
 */
function aplicarSesion(usuario) {
  const chip = document.getElementById('usuario-chip');
  const cerrar = document.getElementById('btn-cerrar-sesion');
  const nuevoEvento = document.getElementById('btn-nuevo-evento');
  const herramientasStaff = document.getElementById('herramientas-staff');

  if (chip) {
    const rol = usuario.esStaff ? '🎓 ' + usuario.rango : usuario.rango;
    chip.innerHTML = `
      <span class="usuario-chip-texto">
        Hola, <strong>${escaparHTML(usuario.nombre)}</strong>
        <small>${escaparHTML(rol)}</small>
      </span>`;
    chip.title = `Conectado como ${usuario.nombre} (${usuario.rango})`;
  }
  if (cerrar) cerrar.hidden = false;

  if (nuevoEvento) {
    nuevoEvento.hidden = !usuario.esStaff;
    if (usuario.esStaff) nuevoEvento.title = 'Crear un evento (obby)';
  }
  if (herramientasStaff) {
    herramientasStaff.hidden = !usuario.esStaff;
  }
}

/* ============================================================
   CABECERA / NAVEGACIÓN
   ============================================================ */

function construirCabecera(paginaActual) {
  const header = document.createElement('header');
  header.className = 'header';

  const nav = document.createElement('nav');
  nav.className = 'nav contenedor';

  const logo = document.createElement('a');
  logo.className = 'nav-logo';
  logo.setAttribute('href', 'index.html');
  logo.setAttribute('aria-label', 'Soporte Movistar — Inicio');
  logo.innerHTML = `
    <span class="logo-icono" aria-hidden="true">⚡</span>
    <span>
      <strong>SOPORTE MOVISTAR</strong>
      <span class="logo-texto">Sala de Eventos</span>
    </span>
  `;

  const ul = document.createElement('ul');
  ul.className = 'nav-links';
  ul.id = 'nav-links';

  PAGES.forEach(pagina => {
    const li = document.createElement('li');
    const enlace = document.createElement('a');
    enlace.setAttribute('href', pagina.href);
    enlace.textContent = pagina.nombre;
    if (pagina.id === paginaActual) {
      enlace.classList.add('activo');
      enlace.setAttribute('aria-current', 'page');
    }
    li.appendChild(enlace);
    ul.appendChild(li);
  });

  const acciones = document.createElement('div');
  acciones.className = 'nav-acciones';

  // Usuario conectado
  const chip = document.createElement('div');
  chip.className = 'usuario-chip';
  chip.id = 'usuario-chip';
  chip.setAttribute('aria-live', 'polite');

  // Botón crear evento (staff)
  const botonNuevoEvento = document.createElement('button');
  botonNuevoEvento.className = 'btn-tema btn-staff';
  botonNuevoEvento.id = 'btn-nuevo-evento';
  botonNuevoEvento.textContent = '➕';
  botonNuevoEvento.hidden = true;
  botonNuevoEvento.setAttribute('aria-label', 'Crear evento');
  botonNuevoEvento.addEventListener('click', () => abrirModalCrearEvento());

  // Tema
  const botonTema = document.createElement('button');
  botonTema.className = 'btn-tema';
  botonTema.id = 'boton-tema';
  botonTema.setAttribute('aria-label', 'Cambiar modo claro u oscuro');
  botonTema.title = 'Cambiar modo claro u oscuro';
  botonTema.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌞' : '🌙';

  // Cerrar sesión
  const botonCerrar = document.createElement('button');
  botonCerrar.className = 'btn-cerrar-sesion';
  botonCerrar.id = 'btn-cerrar-sesion';
  botonCerrar.textContent = '⏻';
  botonCerrar.hidden = true;
  botonCerrar.title = 'Cerrar sesión';
  botonCerrar.setAttribute('aria-label', 'Cerrar sesión');
  botonCerrar.addEventListener('click', cerrarSesion);

  const botonMenu = document.createElement('button');
  botonMenu.className = 'btn-menu';
  botonMenu.id = 'boton-menu';
  botonMenu.setAttribute('aria-label', 'Abrir menú de navegación');
  botonMenu.setAttribute('aria-expanded', 'false');
  botonMenu.innerHTML = '<span></span><span></span><span></span>';

  acciones.appendChild(chip);
  acciones.appendChild(botonNuevoEvento);
  acciones.appendChild(botonTema);
  acciones.appendChild(botonCerrar);
  acciones.appendChild(botonMenu);

  nav.appendChild(logo);
  nav.appendChild(ul);
  nav.appendChild(acciones);
  header.appendChild(nav);

  document.body.prepend(header);

  inicializarEventosMenu();
}

function inicializarEventosMenu() {
  const boton = document.getElementById('boton-menu');
  const enlaces = document.getElementById('nav-links');
  if (!boton || !enlaces) return;

  boton.addEventListener('click', () => {
    const abierto = enlaces.classList.toggle('abierto');
    boton.classList.toggle('abierto', abierto);
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    boton.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });

  enlaces.querySelectorAll('a').forEach(enlace => {
    enlace.addEventListener('click', () => {
      enlaces.classList.remove('abierto');
      boton.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (evento) => {
    if (!boton.contains(evento.target) && !enlaces.contains(evento.target)) {
      enlaces.classList.remove('abierto');
      boton.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
    }
  });
}

function inicializarBotonTema() {
  const boton = document.getElementById('boton-tema');
  if (!boton) return;
  const actualizarIcono = () => {
    boton.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌞' : '🌙';
  };
  boton.addEventListener('click', () => {
    alternarTema();
    actualizarIcono();
  });
}

/* ============================================================
   PIE DE PÁGINA
   ============================================================ */

function construirPie() {
  const footer = document.createElement('footer');
  footer.className = 'footer';

  footer.innerHTML = `
    <div class="contenedor">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">
            <span class="logo-icono" aria-hidden="true"></span>
            <span>SOPORTE MOVISTAR</span>
          </div>
          <p class="footer-desc">Sala de eventos de la comunidad PokeMMO. Torneos, capturas, concursos y más para nuestros entrenadores.</p>
        </div>
        <div>
          <h4>Navegación</h4>
          <ul>
            <li><a href="index.html">Inicio</a></li>
            <li><a href="eventos.html">Eventos</a></li>
            <li><a href="ranking.html">Ranking</a></li>
            <li><a href="miembros.html">Miembros</a></li>
            <li><a href="historial.html">Historial</a></li>
          </ul>
        </div>
        <div>
          <h4>Comunidad</h4>
          <ul>
            <li><a href="eventos.html">Próximos eventos</a></li>
            <li><a href="historial.html">Eventos finalizados</a></li>
            <li><a href="ranking.html">Mejores jugadores</a></li>
            <li><a href="miembros.html">Miembros del clan</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-legal">
        Proyecto de comunidad para el clan Soporte Movistar.
        Página de fans no afiliada a Pokémon, PokeMMO, Nintendo o Game Freak.
        <span>Soporte Movistar</span> · Sala de Eventos
      </div>
    </div>
  `;

  document.body.appendChild(footer);
}

/* ============================================================
   INSCRIPCIONES A EVENTOS (localStorage)
   ============================================================ */

function obtenerInscripciones() {
  try {
    return JSON.parse(localStorage.getItem(LS_INSCRIPCIONES)) || [];
  } catch (err) {
    return [];
  }
}

function guardarInscripciones(lista) {
  localStorage.setItem(LS_INSCRIPCIONES, JSON.stringify(lista));
}

function estaInscripto(eventoId) {
  const sesion = obtenerSesion();
  if (!sesion) return false;
  return obtenerInscripciones().some(i => i.eventoId === eventoId && i.usuario === sesion.nombre);
}

function inscribirse(eventoId, evento) {
  const sesion = obtenerSesion();
  if (!sesion) return false;
  if (estaInscripto(eventoId)) return false;
  // 1) Guardado local inmediato (UX instantánea, modo offline)
  const lista = obtenerInscripciones();
  lista.push({ eventoId, usuario: sesion.nombre, fecha: new Date().toISOString() });
  guardarInscripciones(lista);

  // 2) Sincronizar con la API centralizada (si está disponible y el evento es remoto)
  const idApi = idApiDeEvento(evento);
  if (idApi) {
    window.SM_API.inscribirse(idApi, { usuario: sesion.nombre, fecha: new Date().toISOString() })
      .catch(err => console.warn('API: no se pudo inscribir remotamente:', err.message));
  }

  return true;
}

function cancelarInscripcion(eventoId, evento) {
  const sesion = obtenerSesion();
  if (!sesion) return false;
  guardarInscripciones(
    obtenerInscripciones().filter(i => !(i.eventoId === eventoId && i.usuario === sesion.nombre))
  );

  const idApi = idApiDeEvento(evento);
  if (idApi) {
    window.SM_API.cancelarInscripcion(idApi, sesion.nombre)
      .catch(err => console.warn('API: no se pudo cancelar inscripción remotamente:', err.message));
  }

  return true;
}

/**
 * Convierte {fecha: 'AAAA-MM-DD', hora: 'HH:MM'} a instante (ms).
 * Devuelve null si no hay fecha.
 */
function instanteEvento(fecha, hora) {
  if (!fecha) return null;
  const f = new Date(fecha.replace(/-/g, '/'));
  if (hora) {
    const [hh, mm] = hora.split(':');
    f.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
  }
  return f.getTime();
}

/**
 * ¿Ya terminó el evento? True si el estado lo marca, o si la fecha/hora de
 * finalización pasó (o, en su defecto, la fecha/hora de inicio cuando no hay fin).
 */
function eventoTerminado(evento) {
  if (evento.estado === 'finalizado' || evento.estado === 'cancelado') return true;
  const ahora = Date.now();
  const fin = instanteEvento(evento.fechaFin, evento.horaFin) ||
              instanteEvento(evento.fecha, evento.hora);
  return fin !== null && ahora > fin;
}

/**
 * ¿Se pueden registrar inscripciones ahora?
 * - "cerrada": solo hasta la hora de inicio del evento.
 * - "abierta": hasta que termine el evento.
 * - Si faltan datos, se considera cerrada (solo hasta el inicio).
 */
function inscripcionesAbiertas(evento) {
  if (eventoTerminado(evento)) return false;
  const ahora = Date.now();
  if (evento.inscripcion === 'abierta') {
    const fin = instanteEvento(evento.fechaFin, evento.horaFin) ||
                instanteEvento(evento.fecha, evento.hora);
    return fin === null || ahora <= fin;
  }
  // cerrada: hasta el inicio del evento
  const inicio = instanteEvento(evento.fecha, evento.hora);
  return inicio === null || ahora <= inicio;
}

/**
 * Devuelve los participantes combinados (base del JSON + inscripciones locales).
 */
function participantesDelEvento(evento) {
  const base = Array.isArray(evento.participantes) ? evento.participantes.slice() : [];
  const locales = obtenerInscripciones()
    .filter(i => i.eventoId === evento.id)
    .map(i => i.usuario);
  const set = new Set();
  base.forEach(n => set.add(n));
  locales.forEach(n => set.add(n));
  return [...set];
}

/* ============================================================
   EVENTOS CREADOS POR STAFF (localStorage)
   ============================================================ */

function obtenerEventosStaff() {
  try {
    return JSON.parse(localStorage.getItem(LS_EVENTOS_STAFF)) || [];
  } catch (err) {
    return [];
  }
}

function guardarEventosStaff(lista) {
  localStorage.setItem(LS_EVENTOS_STAFF, JSON.stringify(lista));
}

function guardarEventoStaff(evento) {
  const lista = obtenerEventosStaff();
  lista.push(evento);
  guardarEventosStaff(lista);
  registrarAnuncioDeEvento(evento);

  // Subir a la API centralizada (si está disponible y el usuario es staff)
  apiEstaDisponible().then((disponible) => {
    if (!disponible) return;
    const sesion = obtenerSesion();
    if (!sesion || !sesion.esStaff) return;
    const limpio = { ...evento };
    delete limpio._local;
    delete limpio._api;
    window.SM_API.crearEvento(limpio)
      .then((creado) => {
        if (creado && creado.id) {
          // Sustituir el evento local por el remoto (con su id real)
          guardarEventosStaff(obtenerEventosStaff().filter(e => e.id !== evento.id));
          const remoto = Object.assign({}, limpio, { id: creado.id, _local: false, _api: true });
          guardarEventosStaff([...obtenerEventosStaff(), remoto]);
          registrarAnuncioDeEvento(remoto);
          document.dispatchEvent(new CustomEvent('sm:eventosActualizados'));
        }
      })
      .catch(err => console.warn('API: no se pudo crear el evento remotamente:', err.message));
  });
}

function eliminarEventoLocal(id) {
  guardarEventosStaff(obtenerEventosStaff().filter(e => e.id !== id));
  document.dispatchEvent(new CustomEvent('sm:eventosActualizados'));
}

/**
 * Devuelve TODOS los eventos: los del JSON + los creados por staff (local).
 */
async function obtenerEventos() {
  const base = await cargarJSON(RUTAS.eventos);
  const locales = obtenerEventosStaff();
  const disponibles = await apiEstaDisponible();

  let remotos = [];
  if (disponibles && apiActiva()) {
    try {
      remotos = await window.SM_API.listarEventos();
      // Marcar cada evento remoto para saber que viene de la API
      remotos = remotos.map(e => Object.assign({}, e, { _local: false, _api: true }));
    } catch (err) {
      console.warn('No se pudieron obtener eventos de la API:', err.message);
      remotos = [];
    }
  }

  const ids = new Set();
  const resultado = [];
  const agregar = (e) => {
    if (e && e.id !== undefined && !ids.has(e.id)) {
      ids.add(e.id);
      resultado.push(e);
    }
  };
  (Array.isArray(base) ? base : []).forEach(agregar);
  remotos.forEach(agregar);
  locales.forEach(agregar);

  // Ordenar por fecha
  resultado.sort((a, b) => {
    const fa = (a.fecha || '9999').replace(/-/g, '');
    const fb = (b.fecha || '9999').replace(/-/g, '');
    return fa.localeCompare(fb);
  });

  return resultado;
}

/* ============================================================
   MODAL / VENTANAS
   ============================================================ */

function abrirModalCabecera(modal, titulo, emoji, estadoHTML) {
  modal.innerHTML = `
    <div class="modal-overlay" data-cerrar></div>
    <div class="modal-contenido">
      <div class="modal-cabecera">
        <div>
          ${estadoHTML}
          <h2>${emoji} ${titulo}</h2>
        </div>
        <button class="btn-cerrado" data-cerrar aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-cuerpo" id="modal-cuerpo"></div>
    </div>
  `;
  document.body.classList.add('modal-abierto');
  document.body.appendChild(modal);

  modal.querySelectorAll('[data-cerrar]').forEach(el => {
    el.addEventListener('click', () => cerrarModal(modal));
  });

  registrarCierreEsc(modal);

  return modal;
}

/* Solo un listener de Escape activo a la vez, apuntando al modal actual. */
let handlerCierreEsc = null;

function registrarCierreEsc(modal) {
  if (handlerCierreEsc) document.removeEventListener('keydown', handlerCierreEsc);
  handlerCierreEsc = (evento) => {
    if (evento.key === 'Escape') cerrarModal(modal);
  };
  document.addEventListener('keydown', handlerCierreEsc);
}

function cerrarModal(modal) {
  document.body.classList.remove('modal-abierto');
  if (handlerCierreEsc) document.removeEventListener('keydown', handlerCierreEsc);
  handlerCierreEsc = null;
  if (modal) modal.remove();
}

/* ---------- Modal de detalle de evento ---------- */

function construirModalDetalle(evento) {
  const modal = document.createElement('div');
  modal.className = 'modal abierto';
  modal.id = 'modal-detalle';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `Detalles de ${evento.nombre}`);

  const tipoIcono = evento.tipoIcono || TIPO_EMOJIS[evento.tipo] || '🎮';
  const sesion = obtenerSesion();
  const activo = evento.estado === 'proximo' || evento.estado === 'en_curso';
  const esLocal = evento._local === true;

  const estadoHTML = `
    <span class="estado estado-${escaparHTML(evento.estado)}">${etiquetaEstado(evento.estado)}</span>
    ${esLocal ? '<span class="badge-local">LOCAL</span>' : ''}
  `;

  const modalFinal = abrirModalCabecera(modal, evento.nombre, tipoIcono, estadoHTML);

  const cuerpo = modalFinal.querySelector('#modal-cuerpo');

  const participantes = participantesDelEvento(evento);

  const banner = activo
    ? '<span class="estado estado-en_curso" style="font-size:.85rem">EVENTO ACTIVO</span>'
    : (evento.estado === 'finalizado'
        ? '<span class="estado estado-finalizado" style="font-size:.85rem">EVENTO FINALIZADO</span>'
        : '');

  const reglas = (evento.reglas && evento.reglas.length)
    ? `<ol>${evento.reglas.map(r => `<li>${escaparHTML(r)}</li>`).join('')}</ol>`
    : '<p>Sin reglas indicadas.</p>';

  const resultados = (evento.resultados && evento.resultados.length)
    ? `<ol>${evento.resultados.map(r => `<li>${escaparHTML(r)}</li>`).join('')}</ol>`
    : (evento.ganador ? `<p>Ganador: <strong>${escaparHTML(evento.ganador)}</strong></p>` : '<p>Sin resultados publicados.</p>');

  const listaParticipantes = participantes.length
    ? `<ol>${participantes.map(p => `<li>${escaparHTML(p)}</li>`).join('')}</ol>`
    : '<p>Sin participantes todavía. ¡Inscribite!</p>';

  // Zona de inscripción
  let zonaInscripcion = '';
  const inscripcionesAbren = inscripcionesAbiertas(evento);
  if (eventoTerminado(evento)) {
    zonaInscripcion = `<p class="inscripcion-cerrada">🔒 Inscripciones cerradas (el evento ya ${evento.estado === 'cancelado' ? 'fue cancelado' : 'terminó'}).</p>`;
  } else if (!inscripcionesAbren) {
    zonaInscripcion = `<p class="inscripcion-cerrada">🔒 Inscripciones cerradas (el evento ya comenzó y ${evento.inscripcion === 'abierta' ? 'duran solo mientras esté en curso' : 'terminan al empezar'}).</p>`;
  } else if (!sesion) {
    zonaInscripcion = '<p class="inscripcion-cerrada">Inicia sesión para inscribirte.</p>';
  } else if (estaInscripto(evento.id)) {
    zonaInscripcion = `
      <div class="inscripcion-ok">
        <p>✅ Ya estás inscripto a este evento.</p>
        <button class="btn btn-borde" id="btn-cancelar-inscripcion">Cancelar inscripción</button>
      </div>`;
  } else {
    zonaInscripcion = `
      <div class="inscripcion-ok">
        <p>Te vas a inscribir como <strong>${escaparHTML(sesion.nombre)}</strong>.</p>
        <button class="btn btn-amarillo" id="btn-inscribir">Inscribirme</button>
      </div>`;
  }

  // Herramientas de staff
  let herramientasStaff = '';
  if (sesion && sesion.esStaff) {
    const botonFotos = evento.estado === 'finalizado'
      ? `<button class="btn btn-borde" id="btn-agregar-fotos">📷 Agregar fotos a la galería</button>`
      : '';
    herramientasStaff = `
      <div class="modal-seccion staff-herramientas">
        <h4>🧰 Herramientas de staff</h4>
        <div class="staff-botones">
          <button class="btn btn-borde" id="btn-copiar-participantes">📋 Copiar lista de participantes</button>
          ${botonFotos}
          ${esLocal ? `
            <button class="btn btn-borde" id="btn-copiar-json">🧾 Copiar JSON del evento</button>
            <button class="btn btn-borde btn-peligro" id="btn-eliminar-local">🗑 Eliminar evento local</button>` : ''}
        </div>
        ${esLocal ? '<p class="staff-aviso">Este evento aún es local (solo se ve en este navegador). <strong>Copia su JSON y pégalo en <code>data/eventos.json</code></strong> para publicarlo para todos.</p>' : ''}
        <input type="file" id="input-fotos-evento" accept="image/*" multiple hidden>
      </div>`;
  }

  cuerpo.innerHTML = `
    <div class="modal-seccion">
      ${banner}
      <p>${escaparHTML(evento.descripcion)}</p>
    </div>
    <div class="modal-info-grid">
      <div class="modal-info-item"><span class="mii-label">Fecha</span><span class="mii-valor">${formatearFechaLarga(evento.fecha)}</span></div>
      <div class="modal-info-item"><span class="mii-label">Hora</span><span class="mii-valor">${escaparHTML(evento.hora || 'Por definir')} hs</span></div>
            ${evento.fechaFin ? `<div class="modal-info-item"><span class="mii-label">Finaliza</span><span class="mii-valor">${formatearFechaLarga(evento.fechaFin)} ${evento.horaFin ? `· ${escaparHTML(evento.horaFin)} hs` : ''}</span></div>` : ''}
      <div class="modal-info-item"><span class="mii-label">Tipo</span><span class="mii-valor">${escaparHTML(tipoIcono)} ${escaparHTML(evento.tipo)}</span></div>
      <div class="modal-info-item"><span class="mii-label">Ubicación</span><span class="mii-valor">${escaparHTML(evento.ubicacion || 'Por definir')}</span></div>
      <div class="modal-info-item"><span class="mii-label">Organizador</span><span class="mii-valor">${escaparHTML(evento.organizador || 'Soporte Movistar')}</span></div>
      <div class="modal-info-item"><span class="mii-label">Premio</span><span class="mii-valor">🏆 ${escaparHTML(evento.premio || 'Premio del evento')}</span></div>
    </div>
    <div class="modal-seccion">
      <h4>Reglas</h4>
      ${reglas}
    </div>
    <div class="modal-seccion">
      <h4>Participantes (${participantes.length})</h4>
      ${listaParticipantes}
    </div>
    <div class="modal-seccion">
      <h4>Inscripción</h4>
      <p class="inscripcion-politica">
        ${evento.inscripcion === 'abierta'
          ? '🟢 Inscripciones abiertas: puedes anotarte mientras el evento esté en curso.'
          : '🔵 Inscripciones cerradas: se anotan hasta que comienza el evento.'}
      </p>
      ${zonaInscripcion}
    </div>
    <div class="modal-seccion">
      <h4>Ganador</h4>
      <p>${evento.ganador ? `🏆 <strong>${escaparHTML(evento.ganador)}</strong>` : 'Todavía no hay ganador.'}</p>
    </div>
    <div class="modal-seccion">
      <h4>Resultados</h4>
      ${resultados}
    </div>
    ${evento.observaciones ? `
    <div class="modal-seccion">
      <h4>Observaciones</h4>
      <p>${escaparHTML(evento.observaciones)}</p>
    </div>` : ''}
    ${herramientasStaff}
  `;

  // Acciones del modal
  const botonInscribir = cuerpo.querySelector('#btn-inscribir');
  if (botonInscribir) {
    botonInscribir.addEventListener('click', () => {
      inscribirse(evento.id, evento);
      mostrarToast('✅ Inscripción confirmada. ¡Nos vemos en el evento!');
      recargarModal(evento);
    });
  }

  const botonCancelar = cuerpo.querySelector('#btn-cancelar-inscripcion');
  if (botonCancelar) {
    botonCancelar.addEventListener('click', () => {
      cancelarInscripcion(evento.id, evento);
      mostrarToast('❌ Inscripción cancelada.');
      recargarModal(evento);
    });
  }

  const copiarParticipantes = cuerpo.querySelector('#btn-copiar-participantes');
  if (copiarParticipantes) {
    copiarParticipantes.addEventListener('click', () => {
      const texto = [
        `Evento: ${evento.nombre}`,
        `Fecha: ${formatearFechaLarga(evento.fecha)}`,
        `Participantes (${participantes.length}):`,
        ...participantes.map((p, i) => `${i + 1}. ${p}`)
      ].join('\n');
      copiarAlPortapapeles(texto, '📋 Lista de participantes copiada');
    });
  }

  const copiarJson = cuerpo.querySelector('#btn-copiar-json');
  if (copiarJson) {
    copiarJson.addEventListener('click', () => {
      const limpio = { ...evento, _local: undefined };
      delete limpio._local;
      copiarAlPortapapeles(JSON.stringify(limpio, null, 2), '🧾 JSON del evento copiado');
    });
  }

  const eliminarLocal = cuerpo.querySelector('#btn-eliminar-local');
  if (eliminarLocal) {
    eliminarLocal.addEventListener('click', () => {
      if (confirm(`¿Eliminar el evento local "${evento.nombre}"? Esta acción no se puede deshacer.`)) {
        eliminarEventoLocal(evento.id);
        cerrarModal(modalFinal);
        mostrarToast('🗑 Evento local eliminado.');
      }
    });
  }

  // --- Agregar fotos del evento a la galería (solo staff y evento finalizado) ---
  const btnAgregarFotos = cuerpo.querySelector('#btn-agregar-fotos');
  const inputFotos = cuerpo.querySelector('#input-fotos-evento');
  if (btnAgregarFotos && inputFotos) {
    btnAgregarFotos.addEventListener('click', () => inputFotos.click());
    inputFotos.addEventListener('change', () => {
      const archivos = Array.from(inputFotos.files || []).filter(f => f.type.startsWith('image/'));
      if (!archivos.length) return;

      let pendientes = archivos.length;
      const leidas = [];

      archivos.forEach(archivo => {
        const lector = new FileReader();
        lector.onload = () => {
          leidas.push(lector.result);
          pendientes--;
          if (pendientes === 0) {
            agregarFotosEvento(evento.id, evento.nombre, leidas, evento);
            mostrarToast(`✅ ${leidas.length} ${leidas.length === 1 ? 'foto agregada' : 'fotos agregadas'} a la galería.`);
            inputFotos.value = '';
            // Refrescar la galería del inicio si está abierta
            if (document.getElementById('galeria-lista')) construirGaleria();
          }
        };
        lector.readAsDataURL(archivo);
      });
    });
  }

  // Cargar inscripciones/participantes remotos de la API (eventos centralizados)
  const idApi = idApiDeEvento(evento);
  if (idApi && apiActiva()) {
    apiEstaDisponible().then((disponible) => {
      if (!disponible) return;
      window.SM_API.listarInscripciones(idApi)
        .then((res) => {
          if (!res) return;
          const remotos = (res.participantes && Array.isArray(res.participantes) ? res.participantes : []);
          const local = obtenerInscripciones()
            .filter(i => i.eventoId === evento.id)
            .map(i => i.usuario);
          const todos = [...new Set([...remotos, ...local])];
          const listaEl = cuerpo.querySelector('.modal-seccion:nth-of-type(4) ol, .modal-seccion > ol');
          const tituloParticipantes = [...cuerpo.querySelectorAll('h4')].find(h => h.textContent.startsWith('Participantes'));
          if (tituloParticipantes) {
            tituloParticipantes.textContent = `Participantes (${todos.length})`;
            const ol = tituloParticipantes.parentElement.querySelector('ol');
            if (ol) {
              ol.innerHTML = todos.length
                ? todos.map(p => `<li>${escaparHTML(p)}</li>`).join('')
                : '<li>Sin participantes todavía.</li>';
            }
          }
        })
        .catch(() => {});
    });
  }
}

function recargarModal(evento) {
  const modal = document.querySelector('.modal#modal-detalle');
  if (modal) modal.remove();
  document.body.classList.remove('modal-abierto');
  construirModalDetalle(evento);
}

/* ---------- Modal de creación de evento (staff) ---------- */

function abrirModalCrearEvento() {
  const sesion = obtenerSesion();
  if (!sesion || !sesion.esStaff) return;

  const modal = document.createElement('div');
  modal.className = 'modal abierto';
  modal.id = 'modal-crear-evento';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Crear nuevo evento');

  const tipos = Object.keys(TIPO_EMOJIS);

  abrirModalCabecera(modal, 'Crear nuevo evento', '➕', '');

  const cuerpo = modal.querySelector('#modal-cuerpo');

  cuerpo.innerHTML = `
    <form id="form-nuevo-evento" class="form-evento">
      <label class="campo">
        <span class="campo-label">Nombre del evento *</span>
        <input type="text" id="ev-nombre" required maxlength="60" placeholder="Torneo PvP Fin de Semana">
      </label>
      <div class="campos-dos">
        <label class="campo">
          <span class="campo-label">Fecha *</span>
          <input type="date" id="ev-fecha" required>
        </label>
        <label class="campo">
          <span class="campo-label">Hora</span>
          <input type="time" id="ev-hora" value="20:00">
        </label>
      </div>
      <div class="campos-dos">
        <label class="campo">
          <span class="campo-label">Fecha de finalización</span>
          <input type="date" id="ev-fecha-fin">
        </label>
        <label class="campo">
          <span class="campo-label">Hora de finalización</span>
          <input type="time" id="ev-hora-fin">
        </label>
      </div>
      <label class="campo">
        <span class="campo-label">Inscripciones</span>
        <select id="ev-inscripcion">
          <option value="cerrada">Cerradas (terminan al empezar el evento)</option>
          <option value="abierta">Abiertas (se puede seguir inscribiendo mientras dure)</option>
        </select>
      </label>
      <div class="campos-dos">
        <label class="campo">
          <span class="campo-label">Tipo</span>
          <select id="ev-tipo">
            ${tipos.map(t => `<option value="${t}">${TIPO_EMOJIS[t]} ${t}</option>`).join('')}
          </select>
        </label>
        <label class="campo">
          <span class="campo-label">Estado</span>
          <select id="ev-estado">
            <option value="proximo">Próximo</option>
            <option value="en_curso">En curso</option>
          </select>
        </label>
      </div>
      <label class="campo">
        <span class="campo-label">Ubicación / zona</span>
        <input type="text" id="ev-ubicacion" maxlength="60" placeholder="Ej: Ciudad Férrica">
      </label>
      <label class="campo">
        <span class="campo-label">Premio</span>
        <input type="text" id="ev-premio" maxlength="80" placeholder="Ej: 1x Shiny + 5.000.000 pokédolares">
      </label>
      <label class="campo">
        <span class="campo-label">Descripción</span>
        <textarea id="ev-descripcion" rows="3" maxlength="300" placeholder="Descripción corta del evento..."></textarea>
      </label>
      <label class="campo">
        <span class="campo-label">Reglas (una por línea)</span>
        <textarea id="ev-reglas" rows="3" placeholder="Respetar a todos los participantes&#10;Cumplir las reglas del evento"></textarea>
      </label>
      <label class="campo">
        <span class="campo-label">Observaciones</span>
        <input type="text" id="ev-observaciones" maxlength="120" placeholder="Opcional">
      </label>
      <p class="form-aviso">${apiActiva() ? '⚙️ Con la API conectada, este evento se guardará de forma <strong>centralizada</strong> y lo verá todo el clan de inmediato.' : '⚠️ Guardas el evento en <strong>este navegador</strong>. Para publicarlo para todo el clan, después copias su JSON y lo pegas en <code>data/eventos.json</code>.'}</p>
      <div class="form-acciones">
        <button type="button" class="btn btn-borde" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-amarillo">Guardar evento</button>
      </div>
    </form>
  `;

  const form = cuerpo.querySelector('#form-nuevo-evento');
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const nombre = document.getElementById('ev-nombre').value.trim();
    const fecha = document.getElementById('ev-fecha').value;
    const tipo = document.getElementById('ev-tipo').value;

    if (!nombre || !fecha) {
      mostrarToast('Completá al menos el nombre y la fecha.');
      return;
    }

    const reglas = document.getElementById('ev-reglas').value
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const nuevoEvento = {
      id: -(Date.now()),
      nombre,
      tipo,
      tipoIcono: TIPO_EMOJIS[tipo],
      fecha,
      hora: document.getElementById('ev-hora').value || '20:00',
      fechaFin: document.getElementById('ev-fecha-fin').value || '',
      horaFin: document.getElementById('ev-hora-fin').value || '',
      inscripcion: document.getElementById('ev-inscripcion').value,
      estado: document.getElementById('ev-estado').value,
      descripcion: document.getElementById('ev-descripcion').value.trim() || 'Evento organizado por el clan Soporte Movistar.',
      ubicacion: document.getElementById('ev-ubicacion').value.trim() || 'Por definir',
      organizador: sesion.nombre,
      premio: document.getElementById('ev-premio').value.trim() || 'Por confirmar',
      imagen: '',
      reglas,
      participantes: [],
      ganador: null,
      resultados: [],
      observaciones: document.getElementById('ev-observaciones').value.trim() || '',
      _local: true
    };

    guardarEventoStaff(nuevoEvento);
    document.dispatchEvent(new CustomEvent('sm:eventosActualizados'));

    // Pantalla de éxito con opción de copiar el JSON
    cuerpo.innerHTML = `
      <div class="creacion-exito">
        <span class="creacion-exito-ico" aria-hidden="true">🎉</span>
        <h3>Evento guardado</h3>
        ${apiActiva()
          ? `<p><strong>${escaparHTML(nuevoEvento.nombre)}</strong> ya aparece en la lista y se está publicando de forma <strong>centralizada</strong> para todo el clan.</p>`
          : `<p><strong>${escaparHTML(nuevoEvento.nombre)}</strong> ya aparece en la lista (con la etiqueta LOCAL).</p>
             <p>Para publicarlo para todo el clan, copia el JSON y pégalo dentro de <code>data/eventos.json</code> (respetando las llaves del archivo).</p>`}
        <div class="staff-botones">
          <button type="button" class="btn btn-amarillo" id="btn-copiar-nuevo-json">🧾 Copiar JSON</button>
          <button type="button" class="btn btn-borde" id="btn-creacion-list" data-cerrar>Listo</button>
        </div>
      </div>`;

    cuerpo.querySelector('#btn-copiar-nuevo-json').addEventListener('click', () => {
      const limpio = { ...nuevoEvento, _local: undefined };
      delete limpio._local;
      copiarAlPortapapeles(JSON.stringify(limpio, null, 2), '🧾 JSON del evento copiado');
    });
    cuerpo.querySelector('#btn-creacion-list').addEventListener('click', () => cerrarModal(modal));
  });
}

/* ============================================================
   PÁGINA DE INICIO
   ============================================================ */

async function construirDestacadoYCountdown() {
  const contenedor = document.getElementById('destacado-espacio');
  const contador = document.getElementById('cuenta-regresiva');
  if (!contenedor && !contador) return;

  const eventos = await obtenerEventos();
  if (!eventos || !eventos.length) {
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="mensaje-vacio">
          <span class="icono" aria-hidden="true">📭</span>
          <h3>No hay eventos próximos</h3>
          <p>Vuelve pronto, estamos preparando nuevos eventos.</p>
        </div>`;
    }
    return;
  }

  const proximos = eventos
    .filter(ev => ev.estado === 'proximo' || ev.estado === 'en_curso')
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  if (!proximos.length) {
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="mensaje-vacio">
          <span class="icono" aria-hidden="true">🎉</span>
          <h3>Todos los eventos han finalizado</h3>
          <p>Próximamente anunciaremos nuevos eventos. ¡Mantente atento!</p>
        </div>`;
    }
    return;
  }

  const evento = proximos[0];

  if (contenedor) {
    const tipoIcono = evento.tipoIcono || TIPO_EMOJIS[evento.tipo] || '🎮';

    contenedor.innerHTML = `
      <article class="destacado grid-destacado">
        <div class="destacado-imagen">
          <img
            src="${escaparHTML(evento.imagen || '')}"
            alt="Imagen del evento ${escaparHTML(evento.nombre)}"
            loading="lazy"
            onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<span class=\\'imagen-fallo\\' aria-hidden=\\'true\\'>${tipoIcono}</span>')">
        </div>
        <div class="destacado-contenido">
          <span class="estado estado-${escaparHTML(evento.estado)}">${etiquetaEstado(evento.estado)}</span>
          ${evento._local ? '<span class="badge-local">LOCAL</span>' : ''}
          <h3>${escaparHTML(evento.nombre)}</h3>
          <div class="destacado-meta">
            <span>${escaparHTML(tipoIcono)} ${escaparHTML(evento.tipo)}</span>
            <span>📅 ${formatearFechaCorta(evento.fecha)}</span>
            <span>🕐 ${escaparHTML(evento.hora || 'Por definir')} hs</span>
            <span>📍 ${escaparHTML(evento.ubicacion || 'Por definir')}</span>
          </div>
          <p class="destacado-desc">${escaparHTML(evento.descripcion)}</p>
          <span class="destacado-premio">🏆 ${escaparHTML(evento.premio || 'Premio del evento')}</span>
          <div class="destacado-acciones">
            <a class="btn btn-amarillo" href="eventos.html" data-detalle="${evento.id}">Ver detalles</a>
            <a class="btn btn-borde" href="eventos.html">Ver todos los eventos</a>
          </div>
        </div>
      </article>`;

    vincularDetalles('index.html');
  }

  const instalarContador = () => {
    if (!contador) return;
    const objetivo = new Date(`${evento.fecha.replace(/-/g, '/')} ${evento.hora || '00:00'}`).getTime();

    const pintar = () => {
      const ahora = Date.now();
      const resto = objetivo - ahora;

      if (resto <= 0) {
        contador.innerHTML = `
          <div class="cd-titulo">ESTE EVENTO YA HA COMENZADO</div>
          <div class="cuenta-regresiva cuenta-finalizada">
            <div class="cd-unidad"><span class="cd-numero">🎮</span></div>
          </div>`;
        return;
      }

      const dias = Math.floor(resto / 86400000);
      const horas = Math.floor((resto % 86400000) / 3600000);
      const minutos = Math.floor((resto % 3600000) / 60000);
      const segundos = Math.floor((resto % 60000) / 1000);

      contador.innerHTML = `
        <div class="cd-titulo">PRÓXIMO EVENTO EN</div>
        <div class="cuenta-regresiva">
          <div class="cd-unidad"><span class="cd-numero">${String(dias).padStart(2, '0')}</span><span class="cd-etiqueta">DÍAS</span></div>
          <div class="cd-unidad"><span class="cd-numero">${String(horas).padStart(2, '0')}</span><span class="cd-etiqueta">HORAS</span></div>
          <div class="cd-unidad"><span class="cd-numero">${String(minutos).padStart(2, '0')}</span><span class="cd-etiqueta">MINUTOS</span></div>
          <div class="cd-unidad"><span class="cd-numero">${String(segundos).padStart(2, '0')}</span><span class="cd-etiqueta">SEGUNDOS</span></div>
        </div>`;
    };

    pintar();
    setInterval(pintar, 1000);
  };

  instalarContador();
}

/* ---------- ANUNCIOS ---------- */

/** Plantillas de anuncio según el tipo de evento al crearlo. */
const PLANTILLAS_ANUNCIO = {
  'PvP':      { icono: '⚔️', titulo: '¡Torneo PvP anunciado!',  texto: eventoTipo => `Se acerca un nuevo torneo PvP. Prepara tu equipo y anótate para la inscripción.` },
  'PvE':      { icono: '🤝', titulo: '¡Nueva actividad PvE!',   texto: eventoTipo => `Súmate a la nueva actividad PvE del clan y colabora con el equipo.` },
  'Torneo':   { icono: '🥊', titulo: '¡Nuevo torneo!',          texto: eventoTipo => `Se viene un nuevo torneo del clan. ¿Tienes lo que hace falta para ganar?` },
  'Captura':  { icono: '✨', titulo: '¡Nueva caza shiny!',      texto: eventoTipo => `Se anuncia una nueva caza. Prepara tus poke balls y atrapa el mejor ejemplar.` },
  'Concurso': { icono: '🎭', titulo: '¡Nuevo concurso!',        texto: eventoTipo => `Muestra tu estilo y participa en el nuevo concurso del clan.` },
  'Trivia':   { icono: '❓', titulo: '¡Trivia en camino!',      texto: eventoTipo => `Pon a prueba tus conocimientos Pokémon en la nueva trivia del clan.` },
  'Búsqueda': { icono: '🗺️', titulo: '¡Nueva búsqueda!',        texto: eventoTipo => `Se anuncia una nueva búsqueda del tesoro. Sigue las pistas y gana.` },
  'Especial': { icono: '🎉', titulo: '¡Evento especial!',       texto: eventoTipo => `El clan prepara un evento especial. ¡No te lo puedes perder!` }
};

function obtenerAnunciosEventosGuardados() {
  try {
    const datos = JSON.parse(localStorage.getItem(LS_ANUNCIOS) || '[]');
    return Array.isArray(datos) ? datos : [];
  } catch (e) {
    return [];
  }
}

function guardarAnunciosEventos(lista) {
  localStorage.setItem(LS_ANUNCIOS, JSON.stringify(lista));
}

/** Genera un anuncio a partir de un evento y lo guarda (si aún no existe). */
function registrarAnuncioDeEvento(evento) {
  const plantilla = PLANTILLAS_ANUNCIO[evento.tipo] || PLANTILLAS_ANUNCIO['Especial'];
  const ahora = new Date();
  const fechaTexto = `${String(ahora.getDate()).padStart(2, '0')}/${String(ahora.getMonth() + 1).padStart(2, '0')}/${ahora.getFullYear()}`;

  const anuncio = {
    icono: plantilla.icono,
    titulo: plantilla.titulo,
    texto: `${plantilla.texto(evento.tipo)} "${evento.nombre}" el día ${evento.fecha}.`,
    fecha: `Hoy, ${fechaTexto}`,
    eventoId: evento.id
  };

  const lista = obtenerAnunciosEventosGuardados();
  if (!lista.some(a => a.eventoId === evento.id)) {
    lista.unshift(anuncio);
    guardarAnunciosEventos(lista);
  }
  return lista;
}

function construirAnuncios() {
  const contenedor = document.getElementById('anuncios-lista');
  if (!contenedor) return;

  const deEventos = obtenerAnunciosEventosGuardados();
  const anuncios = deEventos.length ? deEventos : [
    {
      icono: '📢',
      titulo: 'Bienvenidos al clan',
      texto: 'Aún no hay anuncios de eventos. Cuando un staff anuncie un evento, aparecerá aquí automáticamente.',
      fecha: 'Soporte Movistar'
    }
  ];

  contenedor.innerHTML = anuncios.map(anuncio => `
    <article class="anuncio">
      <span class="anuncio-ico" aria-hidden="true">${anuncio.icono}</span>
      <div>
        <h3>${escaparHTML(anuncio.titulo)}</h3>
        <p>${escaparHTML(anuncio.texto)}</p>
        <span class="anuncio-fecha">🕐 ${escaparHTML(anuncio.fecha)}</span>
      </div>
    </article>
  `).join('');
}

/* ---------- GALERÍA ---------- */

/** Devuelve las colecciones de fotos guardadas (por evento). */
function obtenerGaleria() {
  try {
    const datos = JSON.parse(localStorage.getItem(LS_GALERIA) || '[]');
    return Array.isArray(datos) ? datos : [];
  } catch (e) {
    return [];
  }
}

function guardarGaleria(lista) {
  localStorage.setItem(LS_GALERIA, JSON.stringify(lista));
}

/** Agrega (o actualiza) las fotos de un evento en la galería. */
function agregarFotosEvento(eventoId, nombreEvento, imagenes, evento) {
  const galeria = obtenerGaleria();
  const existente = galeria.find(g => g.eventoId === eventoId);
  if (existente) {
    existente.nombre = nombreEvento;
    existente.imagenes = [...existente.imagenes, ...imagenes];
  } else {
    galeria.unshift({ eventoId, nombre: nombreEvento, imagenes });
  }
  guardarGaleria(galeria);

  // Subir fotos a la API centralizada (si el evento es remoto y está disponible)
  const idApi = idApiDeEvento(evento);
  if (idApi && apiActiva()) {
    apiEstaDisponible().then((disponible) => {
      if (!disponible) return;
      imagenes.forEach(src => {
        window.SM_API.subirFoto(idApi, src)
          .catch(err => console.warn('API: no se pudo subir foto:', err.message));
      });
    });
  }

  return galeria;
}

/** Abre el modal con todas las fotos de una colección. */
function abrirModalGaleria(coleccion) {
  const modal = document.createElement('div');
  modal.className = 'modal abierto';
  modal.id = 'modal-galeria';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `Galería de ${coleccion.nombre}`);

  const imagenes = (coleccion.imagenes || []).filter(Boolean);

  abrirModalCabecera(modal, coleccion.nombre, '📸', '');

  const cuerpo = modal.querySelector('#modal-cuerpo');

  cuerpo.innerHTML = `
    <div class="galeria-luz">
      <img class="galeria-luz-actual" src="" alt="">
    </div>
    ${imagenes.length > 1 ? `
    <div class="galeria-miniaturas">
      ${imagenes.map((src, i) => `
        <button class="galeria-miniatura ${i === 0 ? 'activo' : ''}" data-indice="${i}" aria-label="Foto ${i + 1}">
          <img src="${escaparHTML(src)}" alt="Foto ${i + 1} de ${coleccion.nombre}">
        </button>`).join('')}
    </div>` : ''}
  `;

  const verFoto = (indice) => {
    const img = cuerpo.querySelector('.galeria-luz-actual');
    if (!img) return;
    img.src = imagenes[indice];
    cuerpo.querySelectorAll('.galeria-miniatura').forEach((b, i) => {
      b.classList.toggle('activo', i === indice);
    });
  };

  cuerpo.querySelector('.galeria-luz-actual').src = imagenes[0] || '';
  cuerpo.querySelectorAll('.galeria-miniatura').forEach(btn => {
    btn.addEventListener('click', () => verFoto(Number(btn.getAttribute('data-indice'))));
  });
}

function pintarGaleria(galeria) {
  const contenedor = document.getElementById('galeria-lista');
  if (!contenedor) return;

  if (!galeria.length) {
    contenedor.innerHTML = `
      <div class="mensaje-vacio" style="grid-column:1/-1">
        <span class="icono" aria-hidden="true">📸</span>
        <h3>Aún no hay fotos</h3>
        <p>Cuando el staff publique imágenes de los eventos, aparecerán aquí.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = galeria.map(coleccion => {
    const portada = coleccion.imagenes[0];
    const total = coleccion.imagenes.length;
    return `
      <figure class="galeria-item" tabindex="0" role="button"
        data-galeria="${escaparHTML(String(coleccion.eventoId))}"
        aria-label="Galería del evento: ${escaparHTML(coleccion.nombre)}">
        <img
          src="${escaparHTML(portada)}"
          alt="Portada de ${escaparHTML(coleccion.nombre)}"
          loading="lazy">
        <span class="galeria-contador" aria-hidden="true">${total} 📷</span>
        <figcaption class="galeria-caption">${escaparHTML(coleccion.nombre)}</figcaption>
      </figure>`;
  }).join('');

  contenedor.querySelectorAll('.galeria-item').forEach(item => {
    item.addEventListener('click', () => {
      const eventoId = Number(item.getAttribute('data-galeria'));
      const coleccion = galeria.find(c => c.eventoId === eventoId);
      if (coleccion && coleccion.imagenes && coleccion.imagenes.length) abrirModalGaleria(coleccion);
    });
  });
}

function construirGaleria() {
  const contenedor = document.getElementById('galeria-lista');
  if (!contenedor) return;

  // 1) Pintar de inmediato las colecciones locales
  const locales = obtenerGaleria().filter(c => c.imagenes && c.imagenes.length);
  pintarGaleria(locales);

  // 2) Combinar con fotos centralizadas de la API (eventos remotos)
  apiEstaDisponible().then(async (disponible) => {
    if (!disponible) return;
    try {
      const eventosRemotos = await window.SM_API.listarEventos();
      const resultado = locales.slice();

      for (const ev of eventosRemotos) {
        let fotos = [];
        try {
          const res = await window.SM_API.listarFotos(ev.id);
          fotos = (res && Array.isArray(res)) ? res.map(f => f.datos).filter(Boolean) : [];
        } catch (err) { fotos = []; }
        if (!fotos.length) continue;
        const idx = resultado.findIndex(c => c.eventoId === ev.id);
        if (idx >= 0) {
          const unidas = [...new Set([...resultado[idx].imagenes, ...fotos])];
          resultado[idx] = { ...resultado[idx], imagenes: unidas };
        } else {
          resultado.unshift({ eventoId: ev.id, nombre: ev.nombre, imagenes: fotos });
        }
      }

      // Guardar en localStorage el resultado fusionado para próximas visitas
      guardarGaleria(resultado.map(c => ({
        eventoId: c.eventoId, nombre: c.nombre, imagenes: c.imagenes
      })));

      pintarGaleria(resultado);
    } catch (err) {
      // Si falla, ya mostramos las locales
    }
  });
}

/* ============================================================
   TARJETA DE EVENTO REUTILIZABLE
   ============================================================ */

function tarjetaEventoHTML(evento) {
  const tipoIcono = evento.tipoIcono || TIPO_EMOJIS[evento.tipo] || '🎮';
  const estadoClase = `estado-${evento.estado}`;
  const esLocal = evento._local === true;

  return `
    <article class="tarjeta-evento">
      <div class="tarjeta-imagen">
        <img
          src="${escaparHTML(evento.imagen || '')}"
          alt="Imagen del evento ${escaparHTML(evento.nombre)}"
          loading="lazy"
          onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('beforeend', '<span class=\\'imagen-fallo\\' aria-hidden=\\'true\\'>${tipoIcono}</span>')">
        <span class="tipo-ico" title="${escaparHTML(evento.tipo)}" aria-hidden="true">${tipoIcono}</span>
      </div>
      <div class="tarjeta-cuerpo">
        <div class="tarjeta-estados">
          <span class="estado ${estadoClase}">${etiquetaEstado(evento.estado)}</span>
          ${esLocal ? '<span class="badge-local">LOCAL</span>' : ''}
        </div>
        <h3>${escaparHTML(evento.nombre)}</h3>
        <div class="tarjeta-meta">
          <span>${escaparHTML(tipoIcono)} ${escaparHTML(evento.tipo)}</span>
          <span>📅 ${formatearFechaCorta(evento.fecha)}</span>
          <span>🕐 ${escaparHTML(evento.hora || 'Por definir')} hs</span>
        </div>
        <p class="tarjeta-desc">${escaparHTML(evento.descripcion)}</p>
        <span class="tarjeta-premio">🏆 ${escaparHTML(evento.premio || 'Premio del evento')}</span>
        <div class="tarjeta-pie">
          <button class="btn btn-primario" data-detalle="${evento.id}" aria-label="Ver detalles de ${escaparHTML(evento.nombre)}">
            Ver detalles
          </button>
          <a class="btn btn-borde" href="${esLocal ? 'eventos.html' : (evento.estado === 'finalizado' ? 'historial.html' : 'eventos.html')}">Ir</a>
        </div>
      </div>
    </article>`;
}

/* ============================================================
   VINCULAR BOTONES DE DETALLE
   ============================================================ */

function vincularDetalles(paginaDestino) {
  document.querySelectorAll('[data-detalle]').forEach(boton => {
    boton.addEventListener('click', async (evento) => {
      evento.preventDefault();
      const id = Number(boton.getAttribute('data-detalle'));
      const eventos = await obtenerEventos();
      if (!eventos || !eventos.length) {
        mostrarToast('⚠️ No se pudo cargar el evento.');
        return;
      }
      const eventoEncontrado = eventos.find(ev => ev.id === id);
      if (eventoEncontrado) construirModalDetalle(eventoEncontrado);
    });
  });
}

/* ============================================================
   DATOS DE RESPALDO (para abrir la web sin servidor)
   ============================================================ */

const DATOS_FALLBACK = {
  './data/eventos.json': [],
  './data/ranking.json': [],
  './data/miembros.json': [],
  './data/usuarios.json': [
    { "nombre": "Pixeleado", "rango": "Jefazo", "fechaIngreso": "2026-07-04" },
    { "nombre": "DracerT", "rango": "Staff", "fechaIngreso": "2026-09-06" },
    { "nombre": "Sarasil", "rango": "Staff", "fechaIngreso": "2026-07-04" },
    { "nombre": "VRFabry", "rango": "Staff", "fechaIngreso": "2026-07-18" },
    { "nombre": "LIORash", "rango": "Veterano", "fechaIngreso": "2026-08-03" },
    { "nombre": "PsyduckGOAT", "rango": "Veterano", "fechaIngreso": "2026-07-19" },
    { "nombre": "NandoNA", "rango": "Veterano", "fechaIngreso": "2026-07-20" },
    { "nombre": "FranzuaKY", "rango": "Esclavo", "fechaIngreso": "2026-07-20" },
    { "nombre": "Maxwellw", "rango": "Esclavo", "fechaIngreso": "2026-09-05" },
    { "nombre": "Tatigabitwo", "rango": "Veterano", "fechaIngreso": "2026-07-04" },
    { "nombre": "YukoTink", "rango": "Esclavo", "fechaIngreso": "2026-09-05" },
    { "nombre": "LunaPKxd", "rango": "Mascota", "fechaIngreso": "2026-07-19" },
    { "nombre": "Zhyffer", "rango": "Jugador", "fechaIngreso": "2026-08-15" },
    { "nombre": "ElBrolysitoGGEz", "rango": "Jugador", "fechaIngreso": "2026-08-09" },
    { "nombre": "Meliodaaass", "rango": "Veterano", "fechaIngreso": "2026-08-05" },
    { "nombre": "Alexlff", "rango": "Veterano", "fechaIngreso": "2026-07-25" },
    { "nombre": "Afroditawtf", "rango": "Esclavo", "fechaIngreso": "2026-07-05" },
    { "nombre": "Chillydeuz", "rango": "Veterano", "fechaIngreso": "2026-07-22" }
  ]
};

/* ============================================================
   INICIALIZACIÓN GLOBAL
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();

  const paginaActual = document.body.getAttribute('data-pagina') || 'inicio';
  construirCabecera(paginaActual);

  const botonTema = document.getElementById('boton-tema');
  if (botonTema) {
    botonTema.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌞' : '🌙';
  }
  inicializarBotonTema();
  construirPie();

  // Sesión y login
  const sesion = obtenerSesion();
  if (sesion) {
    aplicarSesion(sesion);
  } else {
    construirLoginGate();
  }

  if (paginaActual === 'inicio') {
    construirDestacadoYCountdown();
    construirAnuncios();
    construirGaleria();
  }

  // Actualizar portada cuando cambian los eventos (staff o inscripciones)
  document.addEventListener('sm:eventosActualizados', () => {
    if (paginaActual === 'inicio') {
      construirDestacadoYCountdown();
      construirAnuncios();
    }
  });
});
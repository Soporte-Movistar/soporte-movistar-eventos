/* ============================================================
   SOPORTE MOVISTAR — eventos.js
   Página de eventos: tarjetas, filtros, buscador, modal
   ============================================================ */

'use strict';

const FILTROS_ESTADO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'proximo', etiqueta: 'Próximos' },
  { valor: 'en_curso', etiqueta: 'En curso' },
  { valor: 'finalizado', etiqueta: 'Finalizados' }
];

const FILTROS_TIPO = [
  { valor: 'todos', etiqueta: 'Todos los tipos' },
  { valor: 'PvP', etiqueta: 'PvP' },
  { valor: 'PvE', etiqueta: 'PvE' },
  { valor: 'Torneo', etiqueta: 'Torneo' },
  { valor: 'Captura', etiqueta: 'Captura' },
  { valor: 'Concurso', etiqueta: 'Concurso' },
  { valor: 'Trivia', etiqueta: 'Trivia' },
  { valor: 'Búsqueda', etiqueta: 'Búsqueda' },
  { valor: 'Especial', etiqueta: 'Especial' }
];

let estadoFiltro = 'todos';
let tipoFiltro = 'todos';
let textoBusqueda = '';

document.addEventListener('DOMContentLoaded', () => {
  construirEstados();
  construirFiltrosTipo();
  construirEstadosContador();
  construirHerramientasStaff();
  cargarEventos();

  // Refrescar cuando cambian los eventos (creados por staff)
  document.addEventListener('sm:eventosActualizados', () => {
    construirEstadosContador();
    cargarEventos();
  });
});

/**
 * Agrega el botón "Crear evento" para el staff en la barra de herramientas.
 */
function construirHerramientasStaff() {
  const contenedor = document.getElementById('herramientas-staff');
  if (!contenedor) return;
  if (contenedor.querySelector('.btn-nuevo-evento')) return;

  contenedor.innerHTML = `
    <button class="btn btn-amarillo btn-nuevo-evento" id="btn-nuevo-evento-pagina"
      aria-label="Crear un nuevo evento">
      ➕ Crear evento
    </button>`;

  contenedor.querySelector('#btn-nuevo-evento-pagina').addEventListener('click', () => abrirModalCrearEvento());
}

/**
 * Renderiza los chips de estado.
 */
function construirEstados() {
  const contenedor = document.getElementById('filtros-estado');
  if (!contenedor) return;

  contenedor.innerHTML = FILTROS_ESTADO.map(filtro => `
    <button class="chip ${filtro.valor === 'todos' ? 'activo' : ''}"
      data-estado="${filtro.valor}"
      aria-pressed="${filtro.valor === 'todos' ? 'true' : 'false'}">
      ${filtro.etiqueta}
    </button>
  `).join('');

  contenedor.querySelectorAll('[data-estado]').forEach(chip => {
    chip.addEventListener('click', () => {
      estadoFiltro = chip.getAttribute('data-estado');
      contenedor.querySelectorAll('[data-estado]').forEach(c => {
        const activo = c === chip;
        c.classList.toggle('activo', activo);
        c.setAttribute('aria-pressed', activo ? 'true' : 'false');
      });
      renderizarFiltrados();
    });
  });
}

/**
 * Renderiza los chips de tipo.
 */
function construirFiltrosTipo() {
  const contenedor = document.getElementById('filtros-tipo');
  if (!contenedor) return;

  contenedor.innerHTML = FILTROS_TIPO.map(filtro => `
    <button class="chip ${filtro.valor === 'todos' ? 'activo' : ''}"
      data-tipo="${filtro.valor}"
      aria-pressed="${filtro.valor === 'todos' ? 'true' : 'false'}">
      ${filtro.etiqueta}
    </button>
  `).join('');

  contenedor.querySelectorAll('[data-tipo]').forEach(chip => {
    chip.addEventListener('click', () => {
      tipoFiltro = chip.getAttribute('data-tipo');
      contenedor.querySelectorAll('[data-tipo]').forEach(c => {
        const activo = c === chip;
        c.classList.toggle('activo', activo);
        c.setAttribute('aria-pressed', activo ? 'true' : 'false');
      });
      renderizarFiltrados();
    });
  });
}

/**
 * Muestra contadores por estado.
 */
function construirEstadosContador() {
  obtenerEventos().then(eventos => {
    const contenedor = document.getElementById('mapa-estados');
    if (!contenedor || !eventos) return;

    contenedor.innerHTML = `
      <div class="mapa-estado" data-estado-filtro="proximo" role="button" tabindex="0">
        <span class="estado estado-proximo">PRÓXIMO</span>
        <div class="me-num">${eventos.filter(ev => ev.estado === 'proximo').length}</div>
      </div>
      <div class="mapa-estado" data-estado-filtro="en_curso" role="button" tabindex="0">
        <span class="estado estado-en_curso">EN CURSO</span>
        <div class="me-num">${eventos.filter(ev => ev.estado === 'en_curso').length}</div>
      </div>
      <div class="mapa-estado" data-estado-filtro="finalizado" role="button" tabindex="0">
        <span class="estado estado-finalizado">FINALIZADO</span>
        <div class="me-num">${eventos.filter(ev => ev.estado === 'finalizado').length}</div>
      </div>
      <div class="mapa-estado" data-estado-filtro="cancelado" role="button" tabindex="0">
        <span class="estado estado-cancelado">CANCELADO</span>
        <div class="me-num">${eventos.filter(ev => ev.estado === 'cancelado').length}</div>
      </div>`;

    contenedor.querySelectorAll('[data-estado-filtro]').forEach(caja => {
      const elegir = () => {
        estadoFiltro = caja.getAttribute('data-estado-filtro');
        document.getElementById('filtros-estado')?.querySelectorAll('[data-estado]').forEach(chip => {
          const activo = chip.getAttribute('data-estado') === estadoFiltro;
          chip.classList.toggle('activo', activo);
          chip.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });
        renderizarFiltrados();
        document.getElementById('eventos-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      caja.addEventListener('click', elegir);
      caja.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          elegir();
        }
      });
    });
  });
}

/**
 * Carga los eventos y muestra el grid.
 */
async function cargarEventos() {
  const grid = document.getElementById('eventos-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="preloader" style="grid-column:1/-1">
      <div class="spinner" aria-hidden="true"></div>
      <p>Cargando eventos...</p>
    </div>`;

  const eventos = await obtenerEventos();
  if (!eventos) {
    grid.innerHTML = `
      <div class="mensaje-error" style="grid-column:1/-1">
        <span class="icono" aria-hidden="true">⚠️</span>
        <h3>No se pudieron cargar los eventos</h3>
        <p>Revisa que el archivo <code>data/eventos.json</code> exista y sea válido.</p>
      </div>`;
    return;
  }

  window.eventosCargados = eventos;
  renderizarFiltrados();
}

/**
 * Filtra y renderiza los eventos según los filtros activos.
 */
function renderizarFiltrados() {
  const grid = document.getElementById('eventos-grid');
  if (!grid) return;
  const eventos = window.eventosCargados || [];

  const termino = textoBusqueda.trim().toLowerCase();

  const filtrados = eventos.filter(ev => {
    const cumpleEstado = estadoFiltro === 'todos' || ev.estado === estadoFiltro;
    const cumpleTipo = tipoFiltro === 'todos' || ev.tipo === tipoFiltro;
    const searchable = `${ev.nombre} ${ev.descripcion} ${ev.tipo} ${ev.premio}`.toLowerCase();
    const cumpleBusqueda = !termino || searchable.includes(termino);
    return cumpleEstado && cumpleTipo && cumpleBusqueda;
  });

  if (!filtrados.length) {
    grid.innerHTML = `
      <div class="mensaje-vacio" style="grid-column:1/-1">
        <span class="icono" aria-hidden="true">🔍</span>
        <h3>No se encontraron eventos</h3>
        <p>Prueba cambiar los filtros o el término de búsqueda.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtrados.map(evento => tarjetaEventoHTML(evento)).join('');
  vincularDetalles('eventos.html');
}

document.addEventListener('DOMContentLoaded', () => {
  const buscador = document.getElementById('buscador-eventos');
  if (buscador) {
    buscador.addEventListener('input', (ev) => {
      textoBusqueda = ev.target.value;
      renderizarFiltrados();
    });
  }
});
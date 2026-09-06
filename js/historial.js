/* ============================================================
   SOPORTE MOVISTAR — historial.js
   Página de historial: eventos finalizados con filtros y buscador
   ============================================================ */

'use strict';

let historialTipoFiltro = 'todos';
let historialTextoBusqueda = '';

document.addEventListener('DOMContentLoaded', () => {
  construirFiltrosHistorial();
  cargarHistorial();

  // Refrescar cuando cambian los eventos (creados por staff)
  document.addEventListener('sm:eventosActualizados', () => {
    construirFiltrosHistorial();
    cargarHistorial();
  });
});

function construirFiltrosHistorial() {
  const contenedor = document.getElementById('filtros-historial');
  if (!contenedor) return;

  // Tipos únicos dentro de los eventos finalizados
  obtenerEventos().then(eventos => {
    if (!eventos) return;

    const tiposFinalizados = eventos
      .filter(ev => ev.estado === 'finalizado')
      .map(ev => ev.tipo);

    const tiposUnicos = [...new Set(tiposFinalizados)];

    const opciones = [
      { valor: 'todos', etiqueta: 'Todos' },
      ...tiposUnicos.map(tipo => ({ valor: tipo, etiqueta: tipo }))
    ];

    contenedor.innerHTML = opciones.map(opcion => `
      <button class="chip ${opcion.valor === 'todos' ? 'activo' : ''}"
        data-tipo-historial="${opcion.valor}"
        aria-pressed="${opcion.valor === 'todos' ? 'true' : 'false'}">
        ${escaparHTML(opcion.etiqueta)}
      </button>
    `).join('');

    contenedor.querySelectorAll('[data-tipo-historial]').forEach(chip => {
      chip.addEventListener('click', () => {
        const valor = chip.getAttribute('data-tipo-historial');
        contenedor.querySelectorAll('[data-tipo-historial]').forEach(c => {
          const activo = c === chip;
          c.classList.toggle('activo', activo);
          c.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });
        historialTipoFiltro = valor;
        renderizarHistorial();
      });
    });
  });
}

async function cargarHistorial() {
  const grid = document.getElementById('historial-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="preloader" style="grid-column:1/-1">
      <div class="spinner" aria-hidden="true"></div>
      <p>Cargando historial...</p>
    </div>`;

  const eventos = await obtenerEventos();
  if (!eventos) {
    grid.innerHTML = `
      <div class="mensaje-error" style="grid-column:1/-1">
        <span class="icono" aria-hidden="true">⚠️</span>
        <h3>No se pudo cargar el historial</h3>
        <p>Revisa que el archivo <code>data/eventos.json</code> exista y sea válido.</p>
      </div>`;
    return;
  }

  window.historialEventos = eventos;
  renderizarHistorial();
}

/**
 * Renderiza los eventos finalizados ordenados por fecha (más reciente primero).
 */
function renderizarHistorial() {
  const grid = document.getElementById('historial-grid');
  if (!grid) return;
  const eventos = window.historialEventos || [];

  const termino = historialTextoBusqueda.trim().toLowerCase();

  const finalizados = eventos
    .filter(ev => ev.estado === 'finalizado')
    .filter(ev => {
      const cumpleTipo = historialTipoFiltro === 'todos' || ev.tipo === historialTipoFiltro;
      const searchable = `${ev.nombre} ${ev.descripcion} ${ev.tipo} ${ev.ganador || ''} ${ev.premio}`.toLowerCase();
      const cumpleBusqueda = !termino || searchable.includes(termino);
      return cumpleTipo && cumpleBusqueda;
    })
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  if (!finalizados.length) {
    grid.innerHTML = `
      <div class="mensaje-vacio" style="grid-column:1/-1">
        <span class="icono" aria-hidden="true">📜</span>
        <h3>No hay eventos finalizados</h3>
        <p>Aún no se ha completado ningún evento.</p>
      </div>`;
    return;
  }

  grid.innerHTML = finalizados.map(evento => {
    const tipoIcono = evento.tipoIcono || '🎮';
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
          <span class="estado estado-finalizado">FINALIZADO</span>
          ${esLocal ? '<span class="badge-local">LOCAL</span>' : ''}
        </div>
        <h3>${escaparHTML(evento.nombre)}</h3>
        <div class="tarjeta-meta">
          <span>${escaparHTML(tipoIcono)} ${escaparHTML(evento.tipo)}</span>
          <span>📅 ${formatearFechaCorta(evento.fecha)}</span>
        </div>
        <p class="tarjeta-desc">${escaparHTML(evento.descripcion)}</p>
        <span class="tarjeta-premio">🏆 ${escaparHTML(evento.premio || 'Premio del evento')}</span>
        ${evento.ganador ? `<p class="tarjeta-desc"><strong>🏅 Ganador: ${escaparHTML(evento.ganador)}</strong></p>` : ''}
        <div class="tarjeta-pie">
          <button class="btn btn-primario" data-detalle="${evento.id}" aria-label="Ver detalles de ${escaparHTML(evento.nombre)}">
            Ver detalles
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  vincularDetalles('historial.html');
}

document.addEventListener('DOMContentLoaded', () => {
  const buscador = document.getElementById('buscador-historial');
  if (buscador) {
    buscador.addEventListener('input', (ev) => {
      historialTextoBusqueda = ev.target.value;
      renderizarHistorial();
    });
  }
});
/* ============================================================
   SOPORTE MOVISTAR — miembros.js
   Página de miembros: tarjetas con datos del clan
   ============================================================ */

'use strict';

const ESTADISTICAS_TOTALES = {
  puntos: 0,
  victorias: 0,
  participaciones: 0
};

document.addEventListener('DOMContentLoaded', () => {
  cargarMiembros();
});

async function cargarMiembros() {
  const contenedor = document.getElementById('miembros-grid');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="preloader" style="grid-column:1/-1">
      <div class="spinner" aria-hidden="true"></div>
      <p>Cargando miembros...</p>
    </div>`;

  const miembros = await cargarJSON(RUTAS.miembros);
  if (!miembros) {
    contenedor.innerHTML = `
      <div class="mensaje-error" style="grid-column:1/-1">
        <span class="icono" aria-hidden="true">⚠️</span>
        <h3>No se pudieron cargar los miembros</h3>
        <p>Revisa que el archivo <code>data/miembros.json</code> exista y sea válido.</p>
      </div>`;
    return;
  }

  // Ordenar por puntos descendente
  const ordenados = miembros
    .slice()
    .sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

  // Totales
  ESTADISTICAS_TOTALES.puntos = ordenados.reduce((sum, m) => sum + (m.puntos || 0), 0);
  ESTADISTICAS_TOTALES.victorias = ordenados.reduce((sum, m) => sum + (m.victorias || 0), 0);
  ESTADISTICAS_TOTALES.participaciones = ordenados.reduce((sum, m) => sum + (m.participaciones || 0), 0);

  renderizarResumen(ordenados.length);
  renderizarMiembros(ordenados);
}

function renderizarResumen(totalMiembros) {
  const contenedor = document.getElementById('resumen-clan');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="mapa-estado">
      <div class="me-num">${escaparHTML(totalMiembros)}</div>
      <div class="me-label">Miembros</div>
    </div>
    <div class="mapa-estado">
      <div class="me-num">🏆 ${escaparHTML(ESTADISTICAS_TOTALES.puntos)}</div>
      <div class="me-label">Puntos totales</div>
    </div>
    <div class="mapa-estado">
      <div class="me-num">🏅 ${escaparHTML(ESTADISTICAS_TOTALES.victorias)}</div>
      <div class="me-label">Eventos ganados</div>
    </div>
    <div class="mapa-estado">
      <div class="me-num">🎮 ${escaparHTML(ESTADISTICAS_TOTALES.participaciones)}</div>
      <div class="me-label">Participaciones</div>
    </div>`;
}

function renderizarMiembros(miembros) {
  const contenedor = document.getElementById('miembros-grid');
  if (!contenedor) return;

  contenedor.innerHTML = miembros.map(miembro => `
    <article class="tarjeta-miembro">
      <div class="miembro-avatar" aria-hidden="true">${escaparHTML(miembro.icono || '🎮')}</div>
      <h3>${escaparHTML(miembro.nombre)}</h3>
      <span class="miembro-rango">${escaparHTML(miembro.rango || 'Miembro')}</span>
      <div class="miembro-stats">
        <div class="stat"><span class="stat-num">${escaparHTML(miembro.puntos || 0)}</span><span class="stat-label">Puntos</span></div>
        <div class="stat"><span class="stat-num">${escaparHTML(miembro.victorias || 0)}</span><span class="stat-label">Victorias</span></div>
        <div class="stat"><span class="stat-num">${escaparHTML(miembro.participaciones || 0)}</span><span class="stat-label">Part.</span></div>
      </div>
      <p class="miembro-extra">⚔️ ${escaparHTML(miembro.especialidad || 'General')} · 🐾 ${escaparHTML(miembro.pokemon || '—')}</p>
    </article>
  `).join('');
}
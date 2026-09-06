/* ============================================================
   SOPORTE MOVISTAR — ranking.js
   Página de ranking: tabla ordenada por puntos con podio
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  cargarRanking();
});

async function cargarRanking() {
  const contenedor = document.getElementById('ranking-contenido');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="preloader">
      <div class="spinner" aria-hidden="true"></div>
      <p>Cargando ranking...</p>
    </div>`;

  const ranking = await cargarJSON(RUTAS.ranking);
  if (!ranking) {
    contenedor.innerHTML = `
      <div class="mensaje-error">
        <span class="icono" aria-hidden="true">⚠️</span>
        <h3>No se pudo cargar el ranking</h3>
        <p>Revisa que el archivo <code>data/ranking.json</code> exista y sea válido.</p>
      </div>`;
    return;
  }

  // Ordenar automáticamente por puntos (descendente)
  const ordenado = ranking
    .slice()
    .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
    .map((jugador, indice) => ({ ...jugador, posicion: indice + 1 }));

  const medallas = { 1: '🥇', 2: '🥈', 3: '🥉' };

  const filas = ordenado.map(jugador => {
    const esTop = jugador.posicion <= 3;
    return `
      <tr class="${esTop ? 'fila-top' : ''}">
        <td class="pos pos-${jugador.posicion}">${medallas[jugador.posicion] || jugador.posicion}</td>
        <td><strong>${escaparHTML(jugador.jugador)}</strong></td>
        <td><strong>${escaparHTML(jugador.puntos)}</strong></td>
        <td>${escaparHTML(jugador.victorias || 0)}</td>
        <td>${escaparHTML(jugador.participaciones || 0)}</td>
      </tr>`;
  }).join('');

  contenedor.innerHTML = `
    <div class="tabla-ranking-wrap">
      <table class="tabla-ranking">
        <thead>
          <tr>
            <th scope="col">Posición</th>
            <th scope="col">Jugador</th>
            <th scope="col">Puntos</th>
            <th scope="col">Eventos ganados</th>
            <th scope="col">Participaciones</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
        </tbody>
      </table>
    </div>`;
}
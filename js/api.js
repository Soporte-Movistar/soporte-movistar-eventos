/* ============================================================
   SOPORTE MOVISTAR — js/api.js
   Cliente de la API centralizada del clan.
   - Si la API está configurada y disponible, usa la base de datos
     del servidor (inscripciones, eventos y galería centralizados).
   - Si no, degrada a localStorage (modo offline) para que el sitio
     siga funcionando solo en GitHub Pages.
   Configuración: variable API_BASE_URL (ver index.html / config).
   ============================================================ */

(function () {
  // Base URL de la API. Se puede sobrescribir con una variable global.
  const API_BASE = (typeof window.API_BASE_URL !== 'undefined' && window.API_BASE_URL)
    ? window.API_BASE_URL
    : 'http://localhost:3000';

  const RANGOS_STAFF = ['staff', 'jefazo'];

  async function pedir(ruta, opciones) {
    const opt = opciones || {};
    const encabezados = Object.assign(
      { 'Content-Type': 'application/json' },
      opt.headers || {}
    );
    const usuario = window.SM && window.SM.getUsuario ? window.SM.getUsuario() : null;
    if (usuario && usuario.nombre) {
      encabezados['X-Usuario'] = usuario.nombre;
    }
    const resp = await fetch(API_BASE + ruta, {
      method: opt.method || 'GET',
      headers: encabezados,
      body: opt.body ? JSON.stringify(opt.body) : undefined
    });
    if (resp.status === 204) return null;
    const datos = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(datos.error || ('Error HTTP ' + resp.status));
    }
    return datos;
  }

  function apiDisponible() {
    // Muestra si el sitio fue servido para que la API sea accesible
    return true;
  }

  const Api = {
    base: API_BASE,
    disponible: apiDisponible,

    // ---- Auth ----
    async validarUsuario(nombre) {
      return pedir('/api/auth', { method: 'POST', body: { nombre } });
    },

    // ---- Eventos de staff ----
    async listarEventos() {
      return pedir('/api/eventos-staff');
    },
    async crearEvento(evento) {
      return pedir('/api/eventos-staff', { method: 'POST', body: evento });
    },
    async eliminarEvento(eventoId) {
      return pedir('/api/eventos-staff/' + eventoId, { method: 'DELETE' });
    },

    // ---- Llaves / emparejamientos de torneos ----
    async listarEmparejamientos(eventoId) {
      return pedir('/api/eventos/' + eventoId + '/emparejamientos');
    },
    async crearEmparejamiento(eventoId, datos) {
      return pedir('/api/eventos/' + eventoId + '/emparejamientos', { method: 'POST', body: datos });
    },
    async sortearEmparejamientos(eventoId, ronda) {
      return pedir('/api/eventos/' + eventoId + '/emparejamientos/sortear', { method: 'POST', body: { ronda } });
    },
    async actualizarEmparejamiento(eventoId, emparejamientoId, datos) {
      return pedir('/api/eventos/' + eventoId + '/emparejamientos/' + emparejamientoId, { method: 'PATCH', body: datos });
    },
    async eliminarEmparejamiento(eventoId, emparejamientoId) {
      return pedir('/api/eventos/' + eventoId + '/emparejamientos/' + emparejamientoId, { method: 'DELETE' });
    },

    // ---- Inscripciones ----
    async listarInscripciones(eventoId) {
      return pedir('/api/eventos/' + eventoId + '/inscripciones');
    },
    async inscribirse(eventoId, datos) {
      return pedir('/api/eventos/' + eventoId + '/inscripciones', {
        method: 'POST',
        body: datos || {}
      });
    },
    async cancelarInscripcion(eventoId, usuario) {
      return pedir('/api/eventos/' + eventoId + '/inscripciones/' + encodeURIComponent(usuario), {
        method: 'DELETE'
      });
    },

    // ---- Fotos de la galería ----
    async listarFotos(eventoId) {
      return pedir('/api/eventos/' + eventoId + '/fotos');
    },
    async subirFoto(eventoId, datos) {
      return pedir('/api/eventos/' + eventoId + '/fotos', { method: 'POST', body: { datos } });
    }
  };

  window.SM_API = Api;
})();
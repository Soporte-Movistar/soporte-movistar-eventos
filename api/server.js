/* ============================================================
   SOPORTE MOVISTAR — API — server.js
   Backend con base de datos centralizada (Node + PostgreSQL).
   Dependencia: pg (instalada con npm install).

   Requisito: variable DATABASE_URL (Supabase).
   Ejecutar:  node server.js
   Defecto:   escucha en el puerto de la variable PORT o 3000.
   ============================================================ */

const http = require('http');
const DB = require('./db.js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// CORS: permitir que la web (GitHub Pages u otro origen) llame a la API
const ORIGEN_PERMITIDO = process.env.CORS_ORIGIN || '*';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ORIGEN_PERMITIDO,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Usuario',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function json(res, status, cuerpo) {
  res.writeHead(status, corsHeaders());
  res.end(JSON.stringify(cuerpo));
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let datos = '';
    req.on('data', (c) => {
      datos += c;
      if (datos.length > 30 * 1024 * 1024) {
        reject(new Error('Cuerpo demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!datos) return resolve({});
      try {
        resolve(JSON.parse(datos));
      } catch (e) {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

/* ---------- AUTH ---------- */

async function autenticar(req) {
  const nombre = (req.headers['x-usuario'] || '').toString().trim();
  if (!nombre) return null;
  // Postgres guarda los nombres de columna en minúsculas (esstaff)
  const fila = await DB.consulta('SELECT nombre, rango, esstaff FROM usuarios WHERE nombre = $1', [nombre]);
  const u = fila.rows[0] || null;
  if (u) u.esStaff = !!u.esstaff;
  return u;
}

async function exigirStaff(req, res) {
  const usuario = await autenticar(req);
  if (!usuario) {
    json(res, 401, { error: 'No autenticado: falta X-Usuario' });
    return null;
  }
  if (!usuario.esStaff) {
    json(res, 403, { error: 'Se requieren permisos de staff' });
    return null;
  }
  return usuario;
}

/* ---------- HELPERS de eventos ---------- */

function leerEvento(row) {
  if (!row) return null;
  const parse = (campo) => {
    try { return JSON.parse(campo); } catch (e) { return []; }
  };
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    tipoIcono: row.tipoicono || row.tipoIcono || '🎉',
    fecha: row.fecha,
    hora: row.hora,
    fechaFin: row.fechafin || row.fechaFin || '',
    horaFin: row.horafin || row.horaFin || '',
    inscripcion: row.inscripcion || 'cerrada',
    estado: row.estado,
    descripcion: row.descripcion,
    ubicacion: row.ubicacion,
    region: row.region || '',
    organizador: row.organizador,
    premio: row.premio,
    reglas: parse(row.reglas),
    participantes: parse(row.participantes),
    ganador: row.ganador,
    resultados: parse(row.resultados),
    observaciones: row.observaciones,
    _local: false,
    _api: true,
    creadoPor: row.creado_por
  };
}

function crearEventoDesdeCuerpo(cuerpo, usuario) {
  const parse = (campo) => (cuerpo[campo] !== undefined ? JSON.stringify(cuerpo[campo]) : '[]');
  return {
    nombre: String(cuerpo.nombre || '').slice(0, 200),
    tipo: String(cuerpo.tipo || 'Especial'),
    tipoIcono: String(cuerpo.tipoIcono || '🎉'),
    fecha: String(cuerpo.fecha || ''),
    hora: String(cuerpo.hora || ''),
    fechaFin: String(cuerpo.fechaFin || ''),
    horaFin: String(cuerpo.horaFin || ''),
    inscripcion: String(cuerpo.inscripcion || 'cerrada'),
    estado: String(cuerpo.estado || 'proximo'),
    descripcion: String(cuerpo.descripcion || ''),
    ubicacion: String(cuerpo.ubicacion || ''),
    region: String(cuerpo.region || ''),
    organizador: String(cuerpo.organizador || usuario.nombre),
    premio: String(cuerpo.premio || ''),
    reglas: parse('reglas'),
    participantes: parse('participantes'),
    ganador: cuerpo.ganador ? String(cuerpo.ganador) : null,
    resultados: parse('resultados'),
    observaciones: String(cuerpo.observaciones || ''),
    creado_por: usuario.nombre
  };
}

/** Interpreta una fila de la tabla emparejamientos como objeto JSON. */
function leerEmparejamiento(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventoId: row.evento_id,
    ronda: row.ronda,
    jugador1: row.jugador1,
    jugador2: row.jugador2 || '',
    ganador: row.ganador || '',
    _api: true
  };
}

/* ---------- RUTAS ---------- */

async function manejar(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ruta = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  // ---- Auth / validar usuario ----
  if (ruta === '/api/auth' && req.method === 'POST') {
    const cuerpo = await leerCuerpo(req);
    const fila = await DB.consulta('SELECT nombre, rango, esstaff FROM usuarios WHERE nombre = $1', [String(cuerpo.nombre || '').trim()]);
    const usuario = fila.rows[0];
    if (!usuario) return json(res, 404, { error: 'Usuario no encontrado' });
    return json(res, 200, { nombre: usuario.nombre, rango: usuario.rango, esStaff: !!usuario.esstaff });
  }

  // ---- Eventos de staff ----
  if (ruta === '/api/eventos-staff' && req.method === 'GET') {
    const fila = await DB.consulta('SELECT * FROM eventos ORDER BY fecha ASC, id DESC');
    return json(res, 200, fila.rows.map(leerEvento));
  }

  if (ruta === '/api/eventos-staff' && req.method === 'POST') {
    const staff = await exigirStaff(req, res);
    if (!staff) return;
    const cuerpo = await leerCuerpo(req);
    const ev = crearEventoDesdeCuerpo(cuerpo, staff);
    if (!ev.nombre) return json(res, 400, { error: 'El nombre es obligatorio' });
    if (ev.fecha && ev.fechaFin && ev.fechaFin < ev.fecha) {
      return json(res, 400, { error: 'La fecha de finalización no puede ser anterior a la de inicio' });
    }
    const insert = await DB.consulta(`
      INSERT INTO eventos (nombre, tipo, tipoIcono, fecha, hora, fechaFin, horaFin, inscripcion,
        estado, descripcion, ubicacion, region, organizador, premio, reglas, participantes, ganador,
        resultados, observaciones, creado_por, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id
    `, [
      ev.nombre, ev.tipo, ev.tipoIcono, ev.fecha, ev.hora, ev.fechaFin, ev.horaFin, ev.inscripcion,
      ev.estado, ev.descripcion, ev.ubicacion, ev.region, ev.organizador, ev.premio, ev.reglas, ev.participantes,
      ev.ganador, ev.resultados, ev.observaciones, ev.creado_por, new Date().toISOString()
    ]);
    const id = insert.rows[0].id;
    const nuevo = await DB.consulta('SELECT * FROM eventos WHERE id = $1', [id]);
    return json(res, 201, leerEvento(nuevo.rows[0]));
  }

  // Rutas que operan sobre un evento por id (actualizar / eliminar).
  const mEventoDel = ruta.match(/^\/api\/eventos-staff\/(\d+)$/);

  // Actualizar un evento publicado (solo staff).
  if (mEventoDel && mEventoDel[1] && req.method === 'PATCH') {
    const staff = await exigirStaff(req, res);
    if (!staff) return;
    const cuerpo = await leerCuerpo(req);
    const ev = crearEventoDesdeCuerpo(cuerpo, staff);
    if (!ev.nombre) return json(res, 400, { error: 'El nombre es obligatorio' });
    const update = await DB.consulta(`
      UPDATE eventos SET nombre=$1, tipo=$2, tipoIcono=$3, fecha=$4, hora=$5, fechaFin=$6, horaFin=$7,
        inscripcion=$8, estado=$9, descripcion=$10, ubicacion=$11, region=$12, organizador=$13, premio=$14,
        reglas=$15, participantes=$16, ganador=$17, resultados=$18, observaciones=$19
      WHERE id=$20 RETURNING id
    `, [
      ev.nombre, ev.tipo, ev.tipoIcono, ev.fecha, ev.hora, ev.fechaFin, ev.horaFin, ev.inscripcion,
      ev.estado, ev.descripcion, ev.ubicacion, ev.region, ev.organizador, ev.premio, ev.reglas,
      ev.participantes, ev.ganador, ev.resultados, ev.observaciones, Number(mEventoDel[1])
    ]);
    if (!update.rows.length) return json(res, 404, { error: 'Evento no encontrado' });
    const filas = await DB.consulta('SELECT * FROM eventos WHERE id = $1', [Number(mEventoDel[1])]);
    return json(res, 200, leerEvento(filas.rows[0]));
  }

  // Eliminar un evento publicado (solo staff). Borra en cascada sus
  // inscripciones y fotos (claves foráneas con ON DELETE CASCADE).
  if (mEventoDel && req.method === 'DELETE') {
    const staff = await exigirStaff(req, res);
    if (!staff) return;
    const eventoId = Number(mEventoDel[1]);
    const existe = await DB.consulta('SELECT id, nombre FROM eventos WHERE id = $1', [eventoId]);
    if (!existe.rows[0]) return json(res, 404, { error: 'Evento no encontrado' });
    await DB.consulta('DELETE FROM eventos WHERE id = $1', [eventoId]);
    return json(res, 200, { eliminado: true, id: eventoId, nombre: existe.rows[0].nombre });
  }

  // ---- Inscripciones ----
  const mInsc = ruta.match(/^\/api\/eventos\/(\d+)\/inscripciones(?:\/([^/]+))?$/);
  if (mInsc) {
    const eventoId = Number(mInsc[1]);
    const eventoExiste = await DB.consulta('SELECT id FROM eventos WHERE id = $1', [eventoId]);
    if (!eventoExiste.rows[0]) return json(res, 404, { error: 'Evento no encontrado' });

    // LISTAR inscripciones de un evento
    if (req.method === 'GET') {
      const filas = await DB.consulta('SELECT usuario, fecha FROM inscripciones WHERE evento_id = $1 ORDER BY fecha ASC', [eventoId]);
      const participantes = await DB.consulta('SELECT participantes FROM eventos WHERE id = $1', [eventoId]);
      let base = [];
      try { base = JSON.parse(participantes.rows[0].participantes || '[]'); } catch (e) {}
      const unidos = new Set(base);
      filas.rows.forEach(f => unidos.add(f.usuario));
      return json(res, 200, {
        inscripciones: filas.rows.map(f => ({ usuario: f.usuario, fecha: f.fecha })),
        participantes: [...unidos]
      });
    }

    // INSCRIBIRSE
    if (req.method === 'POST' && !mInsc[2]) {
      const usuario = await autenticar(req);
      if (!usuario) return json(res, 401, { error: 'No autenticado' });
      const ev = await DB.consulta('SELECT * FROM eventos WHERE id = $1', [eventoId]);
      const evObj = leerEvento(ev.rows[0]);

      // La ventana horaria la decide el navegador de cada usuario (hora local
      // del evento), como hizo el sitio siempre. El servidor solo bloquea
      // eventos estructuralmente cerrados, evitando depender de su zona horaria.
      let abiertas = true;
      if (evObj.estado === 'finalizado' || evObj.estado === 'cancelado') abiertas = false;
      if (!abiertas) return json(res, 400, { error: 'Inscripciones cerradas' });

      const cuerpo = await leerCuerpo(req);
      const insUsuario = String(cuerpo.usuario || usuario.nombre).trim();
      const fechaIns = String(cuerpo.fecha || new Date().toISOString());

      if (evObj.inscripcion === 'abierta') {
        await DB.consulta(`
          INSERT INTO inscripciones (evento_id, usuario, fecha)
          VALUES ($1, $2, $3)
          ON CONFLICT (evento_id, usuario) DO NOTHING
        `, [eventoId, insUsuario, fechaIns]);
        const filas = await DB.consulta('SELECT usuario, fecha FROM inscripciones WHERE evento_id = $1 ORDER BY fecha ASC', [eventoId]);
        return json(res, 201, { inscritos: filas.rows, usuario: insUsuario });
      }

      // inscripcion cerrada: el usuario que SE INSCRIBIÓ se agrega como participante
      let base = [];
      try { base = Array.isArray(evObj.participantes) ? evObj.participantes : []; } catch (e) {}
      const set = new Set(base);
      set.add(insUsuario);
      await DB.consulta('UPDATE eventos SET participantes = $1 WHERE id = $2', [JSON.stringify([...set]), eventoId]);
      return json(res, 200, { participantes: [...set], usuario: insUsuario });
    }

    // CANCELAR inscripción
    if (req.method === 'DELETE' && mInsc[2]) {
      const usuarioCancel = decodeURIComponent(mInsc[2]);
      const info = await DB.consulta('DELETE FROM inscripciones WHERE evento_id = $1 AND usuario = $2', [eventoId, usuarioCancel]);
      // También quitarlo del array participantes del evento si estaba ahí
      const ev = await DB.consulta('SELECT participantes FROM eventos WHERE id = $1', [eventoId]);
      if (ev.rows[0] && ev.rows[0].participantes) {
        let base = [];
        try { base = JSON.parse(ev.rows[0].participantes); } catch (e) {}
        const filtrado = base.filter(p => p !== usuarioCancel);
        await DB.consulta('UPDATE eventos SET participantes = $1 WHERE id = $2', [JSON.stringify(filtrado), eventoId]);
      }
      return json(res, 200, { eliminado: info.rowCount > 0, usuario: usuarioCancel });
    }

    return json(res, 405, { error: 'Método no permitido' });
  }

  // ---- Llaves / emparejamientos de torneos y PvP ----
  const mElim = ruta.match(/^\/api\/eventos\/(\d+)\/emparejamientos(?:\/([^/]+))?$/);
  if (mElim) {
    const eventoId = Number(mElim[1]);
    const evExiste = await DB.consulta('SELECT id FROM eventos WHERE id = $1', [eventoId]);
    if (!evExiste.rows[0]) return json(res, 404, { error: 'Evento no encontrado' });
    const mid = mElim[2];

    // LISTAR llaves del evento (visible para todos)
    if (req.method === 'GET') {
      const filas = await DB.consulta(
        'SELECT * FROM emparejamientos WHERE evento_id = $1 ORDER BY ronda ASC, id ASC',
        [eventoId]
      );
      return json(res, 200, filas.rows.map(leerEmparejamiento));
    }

    // SORTEO automático de la ronda (solo staff)
    if (req.method === 'POST' && mid === 'sortear') {
      const staff = await exigirStaff(req, res);
      if (!staff) return;
      const cuerpo = await leerCuerpo(req);
      const ronda = Number(cuerpo.ronda) || 1;
      if (!Number.isInteger(ronda) || ronda < 1) return json(res, 400, { error: 'Ronda inválida' });

      // Candidatos: ronda 1 => inscriptos + participantes; las demás => ganadores de la anterior
      let candidatos = [];
      if (ronda <= 1) {
        const ins = await DB.consulta('SELECT usuario FROM inscripciones WHERE evento_id = $1', [eventoId]);
        candidatos = ins.rows.map(f => f.usuario);
        const ev = await DB.consulta('SELECT participantes FROM eventos WHERE id = $1', [eventoId]);
        if (ev.rows[0]) {
          let base = [];
          try { base = JSON.parse(ev.rows[0].participantes || '[]'); } catch (e) {}
          candidatos = [...new Set([...candidatos, ...base])];
        }
      } else {
        const prev = await DB.consulta(
          'SELECT DISTINCT ganador FROM emparejamientos WHERE evento_id = $1 AND ronda = $2 AND ganador IS NOT NULL',
          [eventoId, ronda - 1]
        );
        candidatos = prev.rows.map(f => f.ganador);
      }

      if (candidatos.length < 2) return json(res, 400, { error: 'Faltan jugadores para sortear esta ronda' });

      const ya = await DB.consulta(
        'SELECT jugador1, jugador2 FROM emparejamientos WHERE evento_id = $1 AND ronda = $2',
        [eventoId, ronda]
      );
      const usados = new Set();
      ya.rows.forEach(f => { usados.add(f.jugador1); if (f.jugador2) usados.add(f.jugador2); });

      const disponibles = candidatos.filter(c => !usados.has(c));
      if (disponibles.length < 2) return json(res, 400, { error: 'Faltan jugadores sin rival para sortear' });

      const mezclados = [...disponibles];
      for (let i = mezclados.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mezclados[i], mezclados[j]] = [mezclados[j], mezclados[i]];
      }

      const creados = [];
      for (let i = 0; i + 1 < mezclados.length; i += 2) {
        const info = await DB.consulta(
          'INSERT INTO emparejamientos (evento_id, ronda, jugador1, jugador2, ganador, created_at) VALUES ($1,$2,$3,$4,NULL,$5) RETURNING *',
          [eventoId, ronda, mezclados[i], mezclados[i + 1], new Date().toISOString()]
        );
        creados.push(leerEmparejamiento(info.rows[0]));
      }
      // Si quedó un jugador impar, pasa de ronda directamente
      if (mezclados.length % 2 === 1) {
        const ultimo = mezclados[mezclados.length - 1];
        const info = await DB.consulta(
          'INSERT INTO emparejamientos (evento_id, ronda, jugador1, jugador2, ganador, created_at) VALUES ($1,$2,$3,NULL,$3,$4) RETURNING *',
          [eventoId, ronda, ultimo, new Date().toISOString()]
        );
        creados.push(leerEmparejamiento(info.rows[0]));
      }
      return json(res, 201, { creados });
    }

    // CREAR cruce manual (solo staff)
    if (req.method === 'POST') {
      const staff = await exigirStaff(req, res);
      if (!staff) return;
      const cuerpo = await leerCuerpo(req);
      const ronda = Number(cuerpo.ronda) || 1;
      const j1 = String(cuerpo.jugador1 || '').trim();
      const j2 = cuerpo.jugador2 ? String(cuerpo.jugador2).trim() : '';
      if (!j1 || !Number.isInteger(ronda) || ronda < 1) {
        return json(res, 400, { error: 'Datos de cruce inválidos' });
      }
      if (j2 && j1 === j2) return json(res, 400, { error: 'Un jugador no puede enfrentarse a sí mismo' });

      const ins = await DB.consulta(
        'SELECT usuario FROM inscripciones WHERE evento_id = $1 AND usuario IN ($2, $3)',
        [eventoId, j1, j2 || j1]
      );
      const inscriptos = new Set(ins.rows.map(f => f.usuario));
      if (!inscriptos.has(j1) || (j2 && !inscriptos.has(j2))) {
        return json(res, 400, { error: 'Ambos jugadores deben estar inscriptos al evento' });
      }

      const ya = await DB.consulta(
        'SELECT jugador1, jugador2 FROM emparejamientos WHERE evento_id = $1 AND ronda = $2',
        [eventoId, ronda]
      );
      const usados = new Set();
      ya.rows.forEach(f => { usados.add(f.jugador1); if (f.jugador2) usados.add(f.jugador2); });
      if (usados.has(j1) || (j2 && usados.has(j2))) {
        return json(res, 409, { error: 'Uno de los jugadores ya tiene rival en esta ronda' });
      }

      const info = await DB.consulta(
        'INSERT INTO emparejamientos (evento_id, ronda, jugador1, jugador2, ganador, created_at) VALUES ($1,$2,$3,$4,NULL,$5) RETURNING *',
        [eventoId, ronda, j1, j2 || null, new Date().toISOString()]
      );
      return json(res, 201, leerEmparejamiento(info.rows[0]));
    }

    // PATCH: marcar/limpiar ganador (solo staff)
    if (req.method === 'PATCH' && mid) {
      const staff = await exigirStaff(req, res);
      if (!staff) return;
      const num = Number(mid);
      const emp = await DB.consulta('SELECT * FROM emparejamientos WHERE id = $1 AND evento_id = $2', [num, eventoId]);
      const fila = emp.rows[0];
      if (!fila) return json(res, 404, { error: 'Cruce no encontrado' });
      const cuerpo = await leerCuerpo(req);
      let ganador = null;
      if (cuerpo.ganador !== undefined && cuerpo.ganador !== null && cuerpo.ganador !== '') {
        ganador = String(cuerpo.ganador);
        if (ganador !== fila.jugador1 && ganador !== (fila.jugador2 || '')) {
          return json(res, 400, { error: 'El ganador debe ser uno de los dos jugadores' });
        }
      }
      await DB.consulta('UPDATE emparejamientos SET ganador = $1 WHERE id = $2', [ganador, fila.id]);
      const nuevo = await DB.consulta('SELECT * FROM emparejamientos WHERE id = $1', [fila.id]);
      return json(res, 200, leerEmparejamiento(nuevo.rows[0]));
    }

    // DELETE: eliminar cruce (solo staff)
    if (req.method === 'DELETE' && mid) {
      const staff = await exigirStaff(req, res);
      if (!staff) return;
      const info = await DB.consulta(
        'DELETE FROM emparejamientos WHERE id = $1 AND evento_id = $2',
        [Number(mid), eventoId]
      );
      return json(res, 200, { eliminado: info.rowCount > 0 });
    }

    return json(res, 405, { error: 'Método no permitido' });
  }

  // ---- Fotos de galería ----
  const mFoto = ruta.match(/^\/api\/eventos\/(\d+)\/fotos$/);
  if (mFoto) {
    const eventoId = Number(mFoto[1]);
    if (req.method === 'GET') {
      const filas = await DB.consulta('SELECT id, datos FROM fotos WHERE evento_id = $1 ORDER BY created_at ASC', [eventoId]);
      return json(res, 200, filas.rows.map(f => ({ id: f.id, datos: f.datos })));
    }
    if (req.method === 'POST') {
      const staff = await exigirStaff(req, res);
      if (!staff) return;
      const ev = await DB.consulta('SELECT id, nombre FROM eventos WHERE id = $1', [eventoId]);
      if (!ev.rows[0]) return json(res, 404, { error: 'Evento no encontrado' });
      const cuerpo = await leerCuerpo(req);
      const datos = String(cuerpo.datos || '');
      if (!datos.startsWith('data:image')) return json(res, 400, { error: 'Imagen inválida' });
      const info = await DB.consulta(
        'INSERT INTO fotos (evento_id, datos, created_at) VALUES ($1, $2, $3) RETURNING id',
        [eventoId, datos, new Date().toISOString()]
      );
      return json(res, 201, { id: info.rows[0].id, evento: ev.rows[0].nombre });
    }
    return json(res, 405, { error: 'Método no permitido' });
  }

  // ---- Health check ----
  if (ruta === '/api/health' || ruta === '/health') {
    return json(res, 200, { ok: true, servicio: 'soporte-movistar-api' });
  }

  return json(res, 404, { error: 'Ruta no encontrada' });
}

const server = http.createServer((req, res) => {
  manejar(req, res).catch((err) => {
    console.error('Error manejando petición:', err);
    json(res, 500, { error: 'Error interno del servidor' });
  });
});

(async () => {
  await DB.inicializar();
  server.listen(PORT, HOST, () => {
    console.log(`✔ API Soporte Movistar escuchando en http://${HOST}:${PORT}`);
  });
})();
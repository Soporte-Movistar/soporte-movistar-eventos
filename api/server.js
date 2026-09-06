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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const insert = await DB.consulta(`
      INSERT INTO eventos (nombre, tipo, tipoIcono, fecha, hora, fechaFin, horaFin, inscripcion,
        estado, descripcion, ubicacion, organizador, premio, reglas, participantes, ganador,
        resultados, observaciones, creado_por, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING id
    `, [
      ev.nombre, ev.tipo, ev.tipoIcono, ev.fecha, ev.hora, ev.fechaFin, ev.horaFin, ev.inscripcion,
      ev.estado, ev.descripcion, ev.ubicacion, ev.organizador, ev.premio, ev.reglas, ev.participantes,
      ev.ganador, ev.resultados, ev.observaciones, ev.creado_por, new Date().toISOString()
    ]);
    const id = insert.rows[0].id;
    const nuevo = await DB.consulta('SELECT * FROM eventos WHERE id = $1', [id]);
    return json(res, 201, leerEvento(nuevo.rows[0]));
  }

  // Eliminar un evento publicado (solo staff). Borra en cascada sus
  // inscripciones y fotos (claves foráneas con ON DELETE CASCADE).
  const mEventoDel = ruta.match(/^\/api\/eventos-staff\/(\d+)$/);
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

      // Reutilizar la misma lógica del frontend para saber si aún se puede
      const ahora = Date.now();
      const instante = (fecha, hora) => {
        if (!fecha) return null;
        const f = new Date(fecha.replace(/-/g, '/'));
        if (hora) { const [hh, mm] = hora.split(':'); f.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0); }
        return f.getTime();
      };
      let abiertas = true;
      if (evObj.estado === 'finalizado' || evObj.estado === 'cancelado') abiertas = false;
      if (abiertas) {
        if (evObj.inscripcion === 'cerrada') {
          const inicio = instante(evObj.fecha, evObj.hora);
          if (inicio !== null && ahora > inicio) abiertas = false;
        } else {
          const fin = instante(evObj.fechaFin, evObj.horaFin) || instante(evObj.fecha, evObj.hora);
          if (fin !== null && ahora > fin) abiertas = false;
        }
      }
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
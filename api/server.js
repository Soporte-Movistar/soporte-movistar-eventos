/* ============================================================
   SOPORTE MOVISTAR — API — server.js
   Backend con base de datos centralizada (Node puro + node:sqlite).
   Cero dependencias externas: solo Node.js (v22+) necesario.

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

function autenticar(req) {
  const nombre = (req.headers['x-usuario'] || '').toString().trim();
  if (!nombre) return null;
  return DB.prepare('SELECT nombre, rango, esStaff FROM usuarios WHERE nombre = ?').get(nombre) || null;
}

function exigirStaff(req, res) {
  const usuario = autenticar(req);
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
    tipoIcono: row.tipoIcono,
    fecha: row.fecha,
    hora: row.hora,
    fechaFin: row.fechaFin || '',
    horaFin: row.horaFin || '',
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

function manejar(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ruta = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  // ---- Auth / validar usuario ----
  if (ruta === '/api/auth' && req.method === 'POST') {
    return leerCuerpo(req).then((cuerpo) => {
      const usuario = DB.prepare('SELECT nombre, rango, esStaff FROM usuarios WHERE nombre = ?')
        .get(String(cuerpo.nombre || '').trim());
      if (!usuario) return json(res, 404, { error: 'Usuario no encontrado' });
      return json(res, 200, { nombre: usuario.nombre, rango: usuario.rango, esStaff: !!usuario.esStaff });
    }).catch((err) => json(res, 400, { error: err.message }));
  }

  // ---- Eventos de staff ----
  if (ruta === '/api/eventos-staff' && req.method === 'GET') {
    const rows = DB.prepare('SELECT * FROM eventos ORDER BY fecha ASC, id DESC').all();
    return json(res, 200, rows.map(leerEvento));
  }

  if (ruta === '/api/eventos-staff' && req.method === 'POST') {
    const staff = exigirStaff(req, res);
    if (!staff) return;
    return leerCuerpo(req).then((cuerpo) => {
      const ev = crearEventoDesdeCuerpo(cuerpo, staff);
      if (!ev.nombre) return json(res, 400, { error: 'El nombre es obligatorio' });
      const insert = DB.prepare(`
        INSERT INTO eventos (nombre, tipo, tipoIcono, fecha, hora, fechaFin, horaFin, inscripcion,
          estado, descripcion, ubicacion, organizador, premio, reglas, participantes, ganador,
          resultados, observaciones, creado_por, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `);
      const info = insert.run(
        ev.nombre, ev.tipo, ev.tipoIcono, ev.fecha, ev.hora, ev.fechaFin, ev.horaFin, ev.inscripcion,
        ev.estado, ev.descripcion, ev.ubicacion, ev.organizador, ev.premio, ev.reglas, ev.participantes,
        ev.ganador, ev.resultados, ev.observaciones, ev.creado_por, new Date().toISOString()
      );
      const nuevo = DB.prepare('SELECT * FROM eventos WHERE id = ?').get(info.lastInsertRowid);
      return json(res, 201, leerEvento(nuevo));
    }).catch((err) => json(res, 400, { error: err.message }));
  }

  // Eliminar un evento publicado (solo staff). Borra en cascada sus
  // inscripciones y fotos (claves foráneas con ON DELETE CASCADE).
  const mEventoDel = ruta.match(/^\/api\/eventos-staff\/(\d+)$/);
  if (mEventoDel && req.method === 'DELETE') {
    const staff = exigirStaff(req, res);
    if (!staff) return;
    const eventoId = Number(mEventoDel[1]);
    const existe = DB.prepare('SELECT id, nombre FROM eventos WHERE id = ?').get(eventoId);
    if (!existe) return json(res, 404, { error: 'Evento no encontrado' });
    DB.prepare('DELETE FROM eventos WHERE id = ?').run(eventoId);
    return json(res, 200, { eliminado: true, id: eventoId, nombre: existe.nombre });
  }

  // ---- Inscripciones ----
  const mInsc = ruta.match(/^\/api\/eventos\/(\d+)\/inscripciones(?:\/([^/]+))?$/);
  if (mInsc) {
    const eventoId = Number(mInsc[1]);
    const eventoExiste = DB.prepare('SELECT id FROM eventos WHERE id = ?').get(eventoId);
    if (!eventoExiste) return json(res, 404, { error: 'Evento no encontrado' });

    // LISTAR inscripciones de un evento
    if (req.method === 'GET') {
      const filas = DB.prepare('SELECT usuario, fecha FROM inscripciones WHERE evento_id = ? ORDER BY fecha ASC').all(eventoId);
      const participantes = DB.prepare('SELECT participantes FROM eventos WHERE id = ?').get(eventoId);
      let base = [];
      try { base = JSON.parse(participantes.participantes || '[]'); } catch (e) {}
      const unidos = new Set(base);
      filas.forEach(f => unidos.add(f.usuario));
      return json(res, 200, {
        inscripciones: filas.map(f => ({ usuario: f.usuario, fecha: f.fecha })),
        participantes: [...unidos]
      });
    }

    // INSCRIBIRSE (m_insc[2] es no definido en POST, usamos el cuerpo)
    if (req.method === 'POST' && !mInsc[2]) {
      const usuario = autenticar(req);
      if (!usuario) return json(res, 401, { error: 'No autenticado' });
      const ev = DB.prepare('SELECT * FROM eventos WHERE id = ?').get(eventoId);
      const evObj = leerEvento(ev);
      // Reutilizar la misma lógica del frontend para saber si aún se puede
      const ahora = Date.now();
      const instante = (fecha, hora) => {
        if (!fecha) return null;
        const f = new Date(fecha.replace(/-/g, '/'));
        if (hora) { const [hh, mm] = hora.split(':'); f.setHours(Number(hh)||0, Number(mm)||0, 0, 0); }
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

      if (evObj.inscripcion === 'abierta') {
        return leerCuerpo(req).then((cuerpo) => {
          const insUsuario = String(cuerpo.usuario || usuario.nombre).trim();
          const fechaIns = String(cuerpo.fecha || new Date().toISOString());
          try {
            DB.prepare('INSERT OR IGNORE INTO inscripciones (evento_id, usuario, fecha) VALUES (?,?,?)')
              .run(eventoId, insUsuario, fechaIns);
          } catch (err) {
            return json(res, 400, { error: err.message });
          }
          const filas = DB.prepare('SELECT usuario, fecha FROM inscripciones WHERE evento_id = ? ORDER BY fecha ASC').all(eventoId);
          return json(res, 201, { inscritos: filas, usuario: insUsuario });
        }).catch((err) => json(res, 400, { error: err.message }));
      }

      // inscripcion cerrada: el usuario que SE INSCRIBIÓ se agrega como participante
      return leerCuerpo(req).then((cuerpo) => {
        const insUsuario = String(cuerpo.usuario || usuario.nombre).trim();
        let base = [];
        try { base = JSON.parse(evObj.participantes ? JSON.stringify(evObj.participantes) : '[]'); } catch (e) {}
        const set = new Set(Array.isArray(base) ? base : []);
        set.add(insUsuario);
        DB.prepare('UPDATE eventos SET participantes = ? WHERE id = ?').run(JSON.stringify([...set]), eventoId);
        return json(res, 200, { participantes: [...set], usuario: insUsuario });
      }).catch((err) => json(res, 400, { error: err.message }));
    }

    // CANCELAR inscripción
    if (req.method === 'DELETE' && mInsc[2]) {
      const usuarioCancel = decodeURIComponent(mInsc[2]);
      // Solo si la inscripción existe como fila
      const info = DB.prepare('DELETE FROM inscripciones WHERE evento_id = ? AND usuario = ?').run(eventoId, usuarioCancel);
      // También quitarlo del array participantes del evento si estaba ahí
      const ev = DB.prepare('SELECT participantes FROM eventos WHERE id = ?').get(eventoId);
      if (ev && ev.participantes) {
        let base = [];
        try { base = JSON.parse(ev.participantes); } catch (e) {}
        const filtrado = base.filter(p => p !== usuarioCancel);
        DB.prepare('UPDATE eventos SET participantes = ? WHERE id = ?').run(JSON.stringify(filtrado), eventoId);
      }
      return json(res, 200, { eliminado: info.changes > 0, usuario: usuarioCancel });
    }

    return json(res, 405, { error: 'Método no permitido' });
  }

  // ---- Fotos de galería ----
  const mFoto = ruta.match(/^\/api\/eventos\/(\d+)\/fotos$/);
  if (mFoto) {
    const eventoId = Number(mFoto[1]);
    if (req.method === 'GET') {
      const filas = DB.prepare('SELECT id, datos FROM fotos WHERE evento_id = ? ORDER BY created_at ASC').all(eventoId);
      return json(res, 200, filas.map(f => ({ id: f.id, datos: f.datos })));
    }
    if (req.method === 'POST') {
      const staff = exigirStaff(req, res);
      if (!staff) return;
      const ev = DB.prepare('SELECT id, nombre FROM eventos WHERE id = ?').get(eventoId);
      if (!ev) return json(res, 404, { error: 'Evento no encontrado' });
      return leerCuerpo(req).then((cuerpo) => {
        const datos = String(cuerpo.datos || '');
        if (!datos.startsWith('data:image')) return json(res, 400, { error: 'Imagen inválida' });
        const info = DB.prepare('INSERT INTO fotos (evento_id, datos, created_at) VALUES (?,?,?)')
          .run(eventoId, datos, new Date().toISOString());
        return json(res, 201, { id: info.lastInsertRowid, evento: ev.nombre });
      }).catch((err) => json(res, 400, { error: err.message }));
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
  try {
    manejar(req, res);
  } catch (err) {
    console.error('Error manejando petición:', err);
    json(res, 500, { error: 'Error interno del servidor' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`✔ API Soporte Movistar escuchando en http://${HOST}:${PORT}`);
});
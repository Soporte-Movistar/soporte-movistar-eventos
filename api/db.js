/* ============================================================
   SOPORTE MOVISTAR — API — db.js
   Base de datos SQLite (node:sqlite, sin dependencias externas)
   ============================================================ */

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB = new DatabaseSync(path.join(DATA_DIR, 'soporte.db'));

// Activar claves foráneas y WAL (mejor concurrencia)
DB.exec('PRAGMA journal_mode = WAL;');
DB.exec('PRAGMA foreign_keys = ON;');

// Tabla de usuarios del clan (acceso). Se siembra desde data/usuarios.json
DB.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    nombre   TEXT PRIMARY KEY,
    rango    TEXT NOT NULL,
    esStaff  INTEGER NOT NULL DEFAULT 0,
    fechaIngreso TEXT
  );
`);

// Eventos creados por staff (persisten en la API para que todos los vean)
DB.exec(`
  CREATE TABLE IF NOT EXISTS eventos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT NOT NULL,
    tipo        TEXT NOT NULL,
    tipoIcono   TEXT,
    fecha       TEXT,
    hora        TEXT,
    fechaFin    TEXT,
    horaFin     TEXT,
    inscripcion TEXT NOT NULL DEFAULT 'cerrada',
    estado      TEXT NOT NULL DEFAULT 'proximo',
    descripcion TEXT,
    ubicacion   TEXT,
    organizador TEXT,
    premio      TEXT,
    reglas      TEXT,
    participantes TEXT,
    ganador     TEXT,
    resultados  TEXT,
    observaciones TEXT,
    creado_por  TEXT,
    created_at  TEXT NOT NULL
  );
`);

// Inscripciones a eventos (centralizadas)
DB.exec(`
  CREATE TABLE IF NOT EXISTS inscripciones (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id  INTEGER NOT NULL,
    usuario    TEXT NOT NULL,
    fecha      TEXT NOT NULL,
    UNIQUE(evento_id, usuario),
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
  );
`);

// Fotos de la galería por evento
DB.exec(`
  CREATE TABLE IF NOT EXISTS fotos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id  INTEGER NOT NULL,
    datos      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
  );
`);

/**
 * Siembra los usuarios del clan desde /data/usuarios.json dentro de la web
 * (para no duplicar la base). Solo se ejecuta si la tabla está vacía.
 */
function sembrarUsuarios() {
  const fila = DB.prepare('SELECT COUNT(*) AS n FROM usuarios').get();
  if (fila.n > 0) return;
  const rutasCandidatas = [
    path.join(__dirname, '..', 'data', 'usuarios.json'),
    path.join(__dirname, '..', '..', 'data', 'usuarios.json')
  ];
  let ruta = rutasCandidatas.find(p => fs.existsSync(p));
  if (!ruta) return;
  try {
    const lista = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    const insert = DB.prepare(
      'INSERT OR IGNORE INTO usuarios (nombre, rango, esStaff, fechaIngreso) VALUES (?, ?, ?, ?)'
    );
    const RANGOS_STAFF = ['staff', 'jefazo'];
    lista.forEach(u => {
      const rango = String(u.rango || '').trim().toLowerCase();
      const esStaff = RANGOS_STAFF.includes(rango) ? 1 : 0;
      insert.run(String(u.nombre || '').trim(), rango, esStaff, u.fechaIngreso || null);
    });
  } catch (err) {
    console.error('No se pudo sembrar usuarios:', err.message);
  }
}

sembrarUsuarios();

module.exports = DB;
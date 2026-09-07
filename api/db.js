/* ============================================================
   SOPORTE MOVISTAR — API — db.js
   Base de datos PostgreSQL (Supabase, gratis y persistente).
   Dependencia: pg (instalada con npm install).
   Requiere la variable de entorno DATABASE_URL (la connection
   string de Supabase). Si no existe, la API avisa y no arranca.
   ============================================================ */

const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('✖ Falta la variable DATABASE_URL (connection string de Supabase).');
  console.error('   Cópiala en Render (Environment → Secret Files / env var) y vuelve a desplegar.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

/** Ejecuta una consulta parametrizada (retorna { rows, rowCount }). */
async function consulta(texto, params) {
  return pool.query(texto, params || []);
}

/** Inicializa las tablas y siembra los usuarios del clan (idempotente). */
async function inicializar() {
  await consulta(`
    CREATE TABLE IF NOT EXISTS usuarios (
      nombre   TEXT PRIMARY KEY,
      rango    TEXT NOT NULL,
      esStaff  INTEGER NOT NULL DEFAULT 0,
      fechaIngreso TEXT
    );
  `);

  await consulta(`
    CREATE TABLE IF NOT EXISTS eventos (
      id          SERIAL PRIMARY KEY,
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
      region      TEXT,
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

  try {
    await consulta(`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS region TEXT;`);
  } catch (err) {
    console.log('(region) ' + err.message);
  }

  await consulta(`
    CREATE TABLE IF NOT EXISTS inscripciones (
      id         SERIAL PRIMARY KEY,
      evento_id  INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
      usuario    TEXT NOT NULL,
      fecha      TEXT NOT NULL,
      UNIQUE(evento_id, usuario)
    );
  `);

  await consulta(`
    CREATE TABLE IF NOT EXISTS fotos (
      id         SERIAL PRIMARY KEY,
      evento_id  INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
      datos      TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await consulta(`
    CREATE TABLE IF NOT EXISTS emparejamientos (
      id         SERIAL PRIMARY KEY,
      evento_id  INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
      ronda      INTEGER NOT NULL DEFAULT 1,
      jugador1   TEXT NOT NULL,
      jugador2   TEXT,
      ganador    TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await sembrarUsuarios();
}

/**
 * Siembra los usuarios del clan desde /data/usuarios.json (dentro de la web)
 * si la tabla está vacía. Los duplicados se ignoran (ON CONFLICT DO NOTHING).
 */
async function sembrarUsuarios() {
  const rutasCandidatas = [
    path.join(__dirname, '..', 'data', 'usuarios.json'),
    path.join(__dirname, '..', '..', 'data', 'usuarios.json')
  ];
  const ruta = rutasCandidatas.find(p => fs.existsSync(p));
  if (!ruta) return;

  try {
    const lista = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    const RANGOS_STAFF = ['staff', 'jefazo'];
    for (const u of lista) {
      const rango = String(u.rango || '').trim().toLowerCase();
      const esStaff = RANGOS_STAFF.includes(rango) ? 1 : 0;
      await consulta(`
        INSERT INTO usuarios (nombre, rango, esStaff, fechaIngreso)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (nombre) DO NOTHING
      `, [String(u.nombre || '').trim(), rango, esStaff, u.fechaIngreso || null]);
    }
    console.log(`✔ Usuarios sembrados (${lista.length})`);
  } catch (err) {
    console.error('No se pudieron sembrar usuarios:', err.message);
  }
}

module.exports = { consulta, inicializar, pool };
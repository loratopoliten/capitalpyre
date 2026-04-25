/**
 * Capital Pyre — Database Client
 * Supports both MySQL (local dev) and PostgreSQL (Supabase production).
 * Set DB_CLIENT=pg in .env to use PostgreSQL.
 */

const DB_CLIENT = process.env.DB_CLIENT || 'mysql';

let pool;

if (DB_CLIENT === 'pg') {
  // ── PostgreSQL (Supabase) ─────────────────────────────────
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Wrap pg to match mysql2 promise API: query() returns [rows, fields]
  const originalQuery = pool.query.bind(pool);
  module.exports = {
    query: async (sql, params = []) => {
      // Convert MySQL ? placeholders to PostgreSQL $1,$2,...
      let i = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++i}`);
      const result = await originalQuery(pgSql, params);
      return [result.rows, result.fields];
    },
    getConnection: () => pool.connect(),
    pool,
  };

} else {
  // ── MySQL (local dev) ─────────────────────────────────────
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host:            process.env.DB_HOST     || 'localhost',
    port:            parseInt(process.env.DB_PORT) || 3306,
    user:            process.env.DB_USER     || 'root',
    password:        process.env.DB_PASSWORD || '',
    database:        process.env.DB_NAME     || 'capitalpyre_db',
    waitForConnections: true,
    connectionLimit:    10,
    timezone:           'Z',
  });

  module.exports = {
    query: (sql, params) => pool.query(sql, params),
    getConnection: () => pool.getConnection(),
    pool,
  };
}

/**
 * Capital Pyre — MySQL Connection Pool
 * Reused directly from IAMS (UB CSI341).
 * Database name: capitalpyre_db
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'capitalpyre',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'capitalpyre_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Verify connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected →', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;

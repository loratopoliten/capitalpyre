/**
 * Capital Pyre — Admin Password Reset
 * Run from project root: node scripts/reset_admin.js
 * Login after: admin@capitalpyre.com / Admin@1234
 */
require('dotenv').config({ path: './backend/.env' })
const mysql  = require('mysql2/promise')
const bcrypt = require('bcryptjs')

async function reset() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'capitalpyre_db',
  })
  const hash = await bcrypt.hash('Admin@1234', 12)
  await conn.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@capitalpyre.com'])
  console.log('✅  Admin password reset to: Admin@1234')
  console.log('    Email: admin@capitalpyre.com')
  console.log('    ⚠️   Change this password after first login!')
  await conn.end()
}
reset().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })

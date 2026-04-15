/**
 * Capital Pyre — Database Initializer
 * Runs all schema migrations and seeds against a local MySQL instance.
 * Usage: npm run db:init  (from backend/)
 */

require('dotenv').config()
const mysql = require('mysql2/promise')
const fs    = require('fs')
const path  = require('path')

const DB_DIR   = path.resolve(__dirname, '../../../db')
const SCHEMA   = path.join(DB_DIR, 'migrations/001_schema.sql')
const SCHEMA2  = path.join(DB_DIR, 'migrations/002_updates.sql')
const SEED     = path.join(DB_DIR, 'seeds/001_seed.sql')

async function init() {
  console.log('\n🔥  Capital Pyre — Database Initializer\n')

  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  })

  console.log('✅  Connected to MySQL')

  try {
    const migrations = [
      { file: SCHEMA,  label: 'schema 001 (base schema)' },
      { file: SCHEMA2, label: 'migration 002 (crs_history, deal_events, ratings, new columns)' },
      { file: SEED,    label: 'seed data' },
    ]

    for (const m of migrations) {
      if (fs.existsSync(m.file)) {
        console.log(`📋  Running ${m.label}…`)
        await conn.query(fs.readFileSync(m.file, 'utf-8'))
        console.log(`✅  ${m.label} applied`)
      } else {
        console.warn(`⚠️   File not found: ${m.file}`)
      }
    }

    console.log('\n🚀  Database ready.')
    console.log('    Default admin: admin@capitalpyre.com / Admin@1234')
    console.log('    ⚠️  Change the admin password on first login!\n')
  } catch (err) {
    console.error('❌  Database init failed:', err.message)
    process.exit(1)
  } finally {
    await conn.end()
  }
}

init()

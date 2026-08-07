// ponytail: runner mínimo, una transacción por archivo y sin rollback hacia atrás. Si algún día
// hace falta bajar migraciones o correrlas en CI contra varias bases, ahí entra node-pg-migrate.

import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Client } = pg

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Falta DATABASE_URL')
  process.exit(1)
}

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

const client = new Client({ connectionString: databaseUrl })
await client.connect()

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const { rows } = await client.query('SELECT version FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.version))

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= ${file} (ya aplicada)`)
      continue
    }

    const sql = await readFile(path.join(migrationsDir, file), 'utf8')
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`+ ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`x ${file}: ${err.message}`)
      process.exit(1)
    }
  }
} finally {
  await client.end()
}

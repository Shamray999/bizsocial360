// Runs a real PostgreSQL instance locally in user space (no Docker / admin),
// using the same credentials as apps/api/.env. Useful for development when a
// container runtime or managed database is not available.
//
//   node scripts/dev-db.mjs   (or: npm run db:local)
//
// Data persists in apps/api/.pgdata (gitignored). Press Ctrl+C to stop.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'bizsocial',
  password: 'bizsocial',
  port: 5432,
  persistent: true,
  // Force UTF8 to match the Azure PostgreSQL target (the Windows default is
  // WIN1252, which rejects emoji and other multi-byte content).
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

const alreadyInitialised = existsSync(resolve(dataDir, 'PG_VERSION'));
if (!alreadyInitialised) {
  console.log('Initialising PostgreSQL data directory…');
  await pg.initialise();
}

await pg.start();
console.log('PostgreSQL started on localhost:5432 (user: bizsocial).');

try {
  await pg.createDatabase('bizsocial360');
  console.log('Created database "bizsocial360".');
} catch {
  console.log('Database "bizsocial360" already exists — reusing it.');
}

console.log('Embedded PostgreSQL is ready. Press Ctrl+C to stop.');

const shutdown = async () => {
  console.log('\nStopping PostgreSQL…');
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Keep the process alive so the database stays up.
await new Promise(() => {});

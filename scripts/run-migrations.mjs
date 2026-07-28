import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Falta SUPABASE_DB_URL');
  process.exit(1);
}

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  process.stdout.write(`→ ${file} ... `);
  try {
    await client.query(sql);
    console.log('OK');
  } catch (error) {
    console.log('ERROR');
    console.error(`  ${error.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log('\nTodas las migraciones aplicadas.');

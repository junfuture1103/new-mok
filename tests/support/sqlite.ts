import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

/** Execute the production SQL against SQLite; no mocked query matching. */
export function testDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) {
    if (sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(file)) continue;
    sqlite.exec(readFileSync(`drizzle/${file}`, 'utf8'));
    sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(file);
  }
  const prepare = (sql: string) => {
    let values: (string | number | null)[] = [];
    const statement = {
      bind(...input: (string | number | null)[]) { values = input; return statement; },
      async first<T>() { return (sqlite.prepare(sql).get(...values) ?? null) as T | null; },
      async run() { const info = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(info.changes) } }; },
    };
    return statement;
  };
  const db = { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
    catch (e) { sqlite.exec('ROLLBACK'); throw e; }
  } } as unknown as D1Database;
  return { db, sqlite };
}

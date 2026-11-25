/**
 * D1 access helpers and row serializers shared by the routes
 */

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  AUTH_LIMIT?: RateLimiter;
}

// D1 rows are untyped; serializers below give them their API shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

type Bind = string | number | boolean | null | undefined;

const clean = (value: Bind): string | number | null =>
  value === undefined ? null : typeof value === 'boolean' ? (value ? 1 : 0) : value;

export function stmt(env: Env, sql: string, ...binds: Bind[]): D1PreparedStatement {
  return env.DB.prepare(sql).bind(...binds.map(clean));
}

export async function all(env: Env, sql: string, ...binds: Bind[]): Promise<Row[]> {
  return (await stmt(env, sql, ...binds).all<Row>()).results;
}

export async function first(env: Env, sql: string, ...binds: Bind[]): Promise<Row | null> {
  return stmt(env, sql, ...binds).first<Row>();
}

export async function run(env: Env, sql: string, ...binds: Bind[]): Promise<D1Result> {
  return stmt(env, sql, ...binds).run();
}

// D1 allows 100 bound parameters per statement
const IN_CHUNK = 90;

/** Run a query with an IN list, replacing {in} with placeholders, in chunks */
export async function allIn(env: Env, sql: string, ids: number[], ...binds: Bind[]): Promise<Row[]> {
  const unique = [...new Set(ids)];
  const rows: Row[] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK);
    const query = sql.replace('{in}', chunk.map(() => '?').join(', '));
    rows.push(...(await all(env, query, ...chunk, ...binds)));
  }
  return rows;
}

/** Run statements in one transaction, split to stay under batch limits */
export async function batch(env: Env, statements: D1PreparedStatement[]): Promise<void> {
  for (let i = 0; i < statements.length; i += 50) {
    await env.DB.batch(statements.slice(i, i + 50));
  }
}

const USER_COLUMNS = ['id', 'email', 'first_name', 'last_name', 'is_active', 'created_at', 'updated_at'];

/** Select list for a joined users row, aliased with a prefix */
export function userColumns(alias: string, prefix: string): string {
  return USER_COLUMNS.map((column) => `${alias}.${column} AS ${prefix}_${column}`).join(', ');
}

export function userDict(row: Row, prefix = ''): Row | null {
  const key = (column: string) => (prefix ? `${prefix}_${column}` : column);
  if (row[key('id')] === null || row[key('id')] === undefined) return null;
  return {
    id: row[key('id')],
    email: row[key('email')],
    first_name: row[key('first_name')],
    last_name: row[key('last_name')],
    full_name: `${row[key('first_name')]} ${row[key('last_name')]}`,
    is_active: !!row[key('is_active')],
    created_at: row[key('created_at')],
    updated_at: row[key('updated_at')],
  };
}

export function groupBy(rows: Row[], column: string): Map<number, Row[]> {
  const groups = new Map<number, Row[]>();
  for (const row of rows) {
    const key = row[column] as number;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

const { Pool } = require('pg')

let pool

function getPool() {
  if (!pool) {
    const conn = process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
    pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
    })
  }
  return pool
}

async function ensureSchema() {
  const client = await getPool().connect()
  try {
    await client.query(`
      create table if not exists events (
        id bigserial primary key,
        ts timestamptz not null default now(),
        site text,
        session_id text,
        visitor_id text,
        type text,
        url text,
        pathname text,
        title text,
        referrer text,
        lang text,
        screen text,
        device text,
        browser text,
        os text,
        utm_source text,
        utm_medium text,
        utm_campaign text,
        event_name text,
        event_params jsonb
      );
      create index if not exists idx_events_ts on events (ts);
      create index if not exists idx_events_site on events (site);
      create index if not exists idx_events_type on events (type);
      create index if not exists idx_events_pathname on events (pathname);
    `)
  } finally {
    client.release()
  }
}

module.exports = { getPool, ensureSchema }

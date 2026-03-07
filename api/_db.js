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

      create table if not exists users (
        id bigserial primary key,
        email text not null,
        password_hash text not null,
        name text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create unique index if not exists idx_users_email_unique on users (lower(email));

      create table if not exists analysis_jobs (
        id text primary key,
        site text not null,
        status text not null default 'pending',
        progress integer default 0,
        pages_added integer default 0,
        error text,
        started_at timestamptz not null default now(),
        completed_at timestamptz,
        updated_at timestamptz not null default now()
      );
      create index if not exists idx_analysis_jobs_site on analysis_jobs (site);
      create index if not exists idx_analysis_jobs_status on analysis_jobs (status);
      create index if not exists idx_analysis_jobs_updated on analysis_jobs (updated_at desc);
    `)
  } finally {
    client.release()
  }
}

module.exports = { getPool, ensureSchema }

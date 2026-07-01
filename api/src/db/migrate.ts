import 'dotenv/config';
import { Pool } from 'pg';

async function migrate(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE severity_enum AS ENUM ('Critical', 'High', 'Medium', 'Low');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE status_enum AS ENUM ('Open', 'InProgress', 'Resolved', 'Closed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS incident_key_seq START 1000
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name       TEXT        NOT NULL,
        email      TEXT        NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        group_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT        NOT NULL UNIQUE,
        description TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        user_id    UUID        NOT NULL REFERENCES users(user_id),
        group_id   UUID        NOT NULL REFERENCES groups(group_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, group_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        incident_id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        key                        TEXT          NOT NULL UNIQUE,
        title                      TEXT          NOT NULL,
        description                TEXT          NOT NULL,
        severity                   severity_enum NOT NULL,
        status                     status_enum   NOT NULL DEFAULT 'Open',
        reporter_id                UUID          NOT NULL REFERENCES users(user_id),
        assignee_id                UUID          REFERENCES users(user_id),
        target_group_id            UUID          NOT NULL REFERENCES groups(group_id),
        resolved_at                TIMESTAMPTZ,
        ai_summary                 TEXT,
        ai_summary_generated_at    TIMESTAMPTZ,
        ai_root_cause              JSONB,
        ai_root_cause_generated_at TIMESTAMPTZ,
        created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS incident_comments (
        comment_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_id UUID        NOT NULL REFERENCES incidents(incident_id),
        author_id   UUID        NOT NULL REFERENCES users(user_id),
        body        TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_incidents_status           ON incidents(status)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_incidents_severity         ON incidents(severity)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_incidents_target_group_id  ON incidents(target_group_id)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_incidents_reporter_id      ON incidents(reporter_id)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_incidents_assignee_id      ON incidents(assignee_id)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_incidents_created_at       ON incidents(created_at DESC)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_incident_comments_incident_id ON incident_comments(incident_id)`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_user_groups_group_id       ON user_groups(group_id)`
    );

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

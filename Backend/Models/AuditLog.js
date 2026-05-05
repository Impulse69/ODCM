const pool = require('../Config/db');

async function createAuditLogsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id           SERIAL PRIMARY KEY,
      actor_user_id INTEGER,
      actor_name   TEXT NOT NULL,
      actor_email  TEXT,
      actor_role   TEXT,
      action       TEXT NOT NULL,
      entity_type  TEXT NOT NULL,
      entity_id    TEXT,
      section      TEXT NOT NULL,
      title        TEXT NOT NULL,
      before_data  JSONB,
      after_data   JSONB,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function recordAuditLog({
  actorUserId = null,
  actorName,
  actorEmail = null,
  actorRole = null,
  action,
  entityType,
  entityId = null,
  section,
  title,
  beforeData = null,
  afterData = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO audit_logs (
      actor_user_id, actor_name, actor_email, actor_role,
      action, entity_type, entity_id, section, title,
      before_data, after_data
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      actorUserId,
      actorName,
      actorEmail,
      actorRole,
      action,
      entityType,
      entityId,
      section,
      title,
      beforeData,
      afterData,
    ]
  );
  return rows[0];
}

async function getAuditLogs(section) {
  const params = [];
  const where = [];
  if (section) {
    params.push(section);
    where.push(`section = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT * FROM audit_logs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

module.exports = { createAuditLogsTable, recordAuditLog, getAuditLogs };
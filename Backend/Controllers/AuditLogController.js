const { getAuditLogs } = require('../Models/AuditLog');

async function listAuditLogs(req, res) {
  try {
    const section = req.query.section ? String(req.query.section).trim() : undefined;
    const data = await getAuditLogs(section);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { listAuditLogs };
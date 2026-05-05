const {
  findByEmail,
  findById,
  getAllUsers,
  createManagedUser,
  updateManagedUser,
  deleteUserById,
} = require('../Models/User');
const { recordAuditLog } = require('../Models/AuditLog');

async function getActor(req) {
  const actor = req.user?.id ? await findById(req.user.id) : null;
  return {
    id: actor?.id ?? req.user?.id ?? null,
    name: actor?.name ?? req.user?.name ?? req.user?.email ?? 'System',
    email: actor?.email ?? req.user?.email ?? null,
    role: actor?.role ?? req.user?.role ?? null,
    is_active: actor?.is_active ?? req.user?.is_active ?? true,
  };
}

async function listUsers(req, res) {
  try {
    const data = await getAllUsers();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createUserAccount(req, res) {
  try {
    const { name, email, role, phone, password, is_active } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ success: false, message: 'Name, email and role are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const created = await createManagedUser({
      name: String(name).trim(),
      email: normalizedEmail,
      role,
      phone: phone ? String(phone).trim() : null,
      password: password ? String(password) : undefined,
      is_active: is_active === undefined ? true : Boolean(is_active),
    });

    const actor = await getActor(req);
    await recordAuditLog({
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'create',
      entityType: 'user',
      entityId: String(created.user.id),
      section: 'users',
      title: `Created user ${created.user.name}`,
      afterData: created.user,
    });

    res.status(201).json({ success: true, data: created.user, tempPassword: created.tempPassword });
  } catch (err) {
    if (String(err.message).toLowerCase().includes('invalid role')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateUserAccount(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }

    const before = await findById(userId);
    if (!before) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (req.user?.id === userId && req.body.is_active === false) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const updated = await updateManagedUser(userId, {
      name: req.body.name === undefined ? undefined : String(req.body.name).trim(),
      email: req.body.email === undefined ? undefined : String(req.body.email).toLowerCase().trim(),
      phone: req.body.phone === undefined ? undefined : String(req.body.phone).trim(),
      role: req.body.role,
      password: req.body.password,
      is_active: req.body.is_active,
    });

    const actor = await getActor(req);
    await recordAuditLog({
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'update',
      entityType: 'user',
      entityId: String(userId),
      section: 'users',
      title: `Updated user ${updated?.name ?? before.name}`,
      beforeData: before,
      afterData: updated,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    if (String(err.message).toLowerCase().includes('invalid role')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteUserAccount(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }

    if (req.user?.id === userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const before = await findById(userId);
    if (!before) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const deleted = await deleteUserById(userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const actor = await getActor(req);
    await recordAuditLog({
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'delete',
      entityType: 'user',
      entityId: String(userId),
      section: 'users',
      title: `Deleted user ${deleted.name}`,
      beforeData: before,
    });

    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { listUsers, createUserAccount, updateUserAccount, deleteUserAccount };
